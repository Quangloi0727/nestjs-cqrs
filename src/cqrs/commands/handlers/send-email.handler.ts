import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendEmailCommand } from '../send-email.command';
import { EmailSessionManagerService } from '../../../email-session-manager';
import { SendEmailDto } from '../../../facade-rest-api/dtos/send-email.dto';
import { LoggingService } from '../../../providers/logging';
import { SaveEmailCommand } from '../save-email.command';
import { Email, EmailDocument } from '../../../schemas';
import { EmailSessionRegistryService } from '../../../email-session-registry';
import { EventPublisherCommand } from '../event-publisher.command';
import { KAFKA_TOPIC_MONITOR } from '../../../common/enums';

@CommandHandler(SendEmailCommand)
export class SendEmailCommandHandler
  implements ICommandHandler<SendEmailCommand, string>
{
  constructor(
    private readonly loggingService: LoggingService,
    private readonly emailSessionManagerService: EmailSessionManagerService,
    private readonly emailSessionRegistryService: EmailSessionRegistryService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: SendEmailCommand): Promise<string> {
    await this.loggingService.debug(
      SendEmailCommandHandler,
      `SendEmailCommandHandler request from email: ${command.message.email}, to: ${command.message.to}`,
    );
    let conversation = command.message.conversationId
      ? await this.emailSessionRegistryService.getEmailConversationById(
          command.message.conversationId,
        )
      : null;
    if (!conversation) {
      conversation =
        await this.emailSessionManagerService.createEmailConversation(
          new Email({
            ReceivedTime: new Date(),
            SenderName: command.message.sender
              ? command.message.sender
              : command.message.email,
            TenantId: command.message.tenantId,
            FromEmail: command.message.email,
            ToEmail: command.message.to,
            CcEmail: command.message.cc,
            BccEmail: command.message.bcc,
            Subject: command.message.subject,
          }),
        );
      conversation.SpamMarked = false;
      conversation.AgentId = command.message.agentId;
      conversation.AssignedDate = new Date();
      await conversation.save();
      command.message.conversationId = conversation.id;
    }

    const sendEmailRequest = SendEmailDto.toSendEmailRequest(command.message);
    const subjectConversationId =
      this.emailSessionRegistryService.getConversationIdFromSubject(
        command.message.subject,
      );

    // add conversationId to subject
    if (!subjectConversationId) {
      sendEmailRequest.message.subject = `#${command.message.conversationId.toUpperCase()} - ${
        sendEmailRequest.message.subject
      }`;
    }

    // send request to email connector
    const response = await this.emailSessionManagerService.sendEmail(
      sendEmailRequest,
    );
    // console.log(response);

    if (response) {
      await this.loggingService.debug(
        SendEmailCommandHandler,
        `SendEmailCommandHandler response: ${JSON.stringify(response)}`,
      );
      const email_request = Email.fromSendEmailRequestDto(command.message);
      // save email
      const email = await this.commandBus.execute<
        SaveEmailCommand,
        EmailDocument
      >(new SaveEmailCommand(email_request));
      // notify to agent

      await this.commandBus.execute(
        new EventPublisherCommand(KAFKA_TOPIC_MONITOR.EMAIL_SENT, email),
      );
      conversation.RelatedEmailId = email.id;
      await conversation.save();
      return email.id;
    }
    return null;
  }
}

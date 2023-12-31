import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  KafkaClientService,
  KafkaService,
  SubscribeTo,
} from '../providers/kafka';
import { EmailDto } from './dto/email.dto';
import { KAFKA_TOPIC } from '../common/enums';
import { EmailReceivedEvent } from '../cqrs';

@Controller()
export class EmailConsumerController implements OnModuleInit {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(KafkaClientService)
    private kafkaService: KafkaService,
  ) {}

  onModuleInit() {
    this.kafkaService.subscribeToResponseOf(
      KAFKA_TOPIC.NEW_EMAIL_RECEIVED,
      this,
    );
  }

  @SubscribeTo(KAFKA_TOPIC.NEW_EMAIL_RECEIVED)
  async onEmailReceived(email: EmailDto): Promise<void> {
    await this.commandBus.execute(new EmailReceivedEvent(email));
  }
}

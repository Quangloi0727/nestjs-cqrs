import { BadRequestException, Inject } from "@nestjs/common"
import { ICommandHandler, CommandHandler, CommandBus } from "@nestjs/cqrs"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { ConversationState, KAFKA_TOPIC_MONITOR, NotifyEventType, ParticipantType } from "../../../common/enums"
import { Conversation, ConversationDocument } from "../../../schemas"
import { LoggingService } from "../../../providers/logging"
import { NotifyNewMessageToAgentCommand } from "../notify-new-message-to-agent.command"
import { ReopenConversationCommand } from "../reopen-conversation.command"
import { KafkaClientService, KafkaService } from "../../../providers/kafka"

@CommandHandler(ReopenConversationCommand)
export class ReopenConversationCommandHandler implements ICommandHandler<ReopenConversationCommand>{
    constructor(
        @InjectModel(Conversation.name)
        private readonly model: Model<ConversationDocument>,
        private readonly loggingService: LoggingService,
        private readonly commandBus: CommandBus,
        @Inject(KafkaClientService)
        private kafkaService: KafkaService
    ) { }

    async execute(body) {
        await this.loggingService.debug(ReopenConversationCommandHandler, `Data receive is: ${JSON.stringify(body.body)}`)
        const { referenceId, cloudAgentId } = body.body
        const findConversation = await this.model.findById(referenceId).lean()
        if (!findConversation) throw new BadRequestException("Not find conversation !")

        const { applicationId, senderId } = findConversation
        const findConvertLast = await this.model.find({ applicationId, senderId, conversationState: { $ne: ConversationState.CLOSE } }).exec()
        if (findConversation && findConvertLast.length) {
            return {
                success: false,
                message: "Đã tồn tại 1 conversation khác đang hoạt động !"
            }
        }

        const dataCreateNewConversation: any = findConversation
        dataCreateNewConversation.startedTime = new Date()
        dataCreateNewConversation.conversationState = ConversationState.INTERACTIVE
        dataCreateNewConversation.agentPicked = cloudAgentId
        dataCreateNewConversation.referenceId = referenceId
        dataCreateNewConversation.agentStartOutbound = cloudAgentId
        dataCreateNewConversation.participants = [findConversation.senderId, cloudAgentId]
        dataCreateNewConversation.startedBy = ParticipantType.AGENT
        delete dataCreateNewConversation.closedTime
        delete dataCreateNewConversation._id
        delete dataCreateNewConversation.messages

        const dataCreated: any = await this.model.create(dataCreateNewConversation)

        const rooms = [`${findConversation.cloudTenantId}_${findConversation.applicationId}`]
        dataCreateNewConversation['conversationId'] = dataCreated._id
        dataCreateNewConversation['agentInitConv'] = cloudAgentId

        // send kafka event create new conversation
        await this.kafkaService.send(dataCreateNewConversation, KAFKA_TOPIC_MONITOR.CONVERSATION_REOPEN)

        // notify to agent
        await this.commandBus.execute(
            new NotifyNewMessageToAgentCommand(
                ParticipantType.AGENT,
                NotifyEventType.NEW_CONVERSATION,
                rooms.join(','),
                {
                    message: dataCreateNewConversation,
                },
            ),
        )
        return {
            statusCode: 200,
            success: true,
            data: dataCreateNewConversation
        }
    }

}
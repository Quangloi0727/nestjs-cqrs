import { Module } from '@nestjs/common';
import { ChatSessionRegistryService } from './chat-session-registry.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema, Message, MessageSchema, Participant, ParticipantSchema } from '../schemas';
import { LoggingModule } from '../providers/logging'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Participant.name, schema: ParticipantSchema },
    ]),
    LoggingModule
  ],
  providers: [ChatSessionRegistryService],
  exports: [ChatSessionRegistryService],
})
export class ChatSessionRegistryModule {}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, ConversationDocument } from '../schemas';
import { BadRequestException } from '@nestjs/common';
import { ConversationState } from '../common/enums';

@Injectable()
export class ChatSessionSupervisingService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly model: Model<ConversationDocument>,
  ) {}

  async joinConversation(
    conversationId: string,
    agentId: number,
  ): Promise<Conversation> {
    const conversation = await this.model.findById(conversationId).lean();
    if (!conversation) throw new BadRequestException('conversation not found!');
    if (conversation.conversationState != ConversationState.INTERACTIVE)
      throw new BadRequestException(
        'Conversation has not in interactive status!',
      );

    const indexOf = conversation.participants.indexOf(agentId.toString());
    if (indexOf > -1)
      throw new BadRequestException('Agent has joined conversation yet!');

    const conversationUpdated = await this.model
      .findByIdAndUpdate(
        conversationId,
        {
          $push: { participants: agentId.toString() },
        },
        { new: true },
      )
      .lean();
    return conversationUpdated;
  }

  async unassignConversation(
    conversationId: string,
    agentId: number,
  ): Promise<Conversation> {
    const conversation = await this.model.findById(conversationId).lean();
    if (!conversation) throw new BadRequestException('conversation not found!');
    if (conversation.conversationState != ConversationState.INTERACTIVE)
      throw new BadRequestException(
        'Conversation has not in interactive status!',
      );

    const indexOf = conversation.participants.indexOf(agentId.toString());
    if (indexOf < 0)
      throw new BadRequestException('Conversation has not handled by agent!');

    conversation.participants.splice(indexOf, 1);
    const conversationUpdated = await this.model
      .findByIdAndUpdate(
        conversationId,
        {
          conversationState: ConversationState.OPEN,
          agentPicked: null,
          pickConversationTime: null,
          $set: { participants: conversation.participants },
        },
        { new: true },
      )
      .lean();
    return conversationUpdated;
  }

  async transferConversation(
    conversationId: string,
    currentAgentId: number,
    newAgentId: number,
  ): Promise<Conversation> {
    const conversation = await this.model.findById(conversationId).lean();
    if (!conversation) throw new BadRequestException('conversation not found!');
    if (conversation.conversationState != ConversationState.INTERACTIVE)
      throw new BadRequestException(
        'Conversation has not in interactive status!',
      );

    const indexOf = conversation.participants.indexOf(
      currentAgentId.toString(),
    );
    if (indexOf < 0)
      throw new BadRequestException('Conversation has not handled by agent!');

    conversation.participants.splice(indexOf, 1);
    conversation.participants.push(newAgentId.toString());

    const conversationUpdated = await this.model
      .findByIdAndUpdate(
        conversationId,
        {
          agentPicked: newAgentId,
          pickConversationTime: new Date(),
          $set: { participants: conversation.participants },
        },
        { new: true },
      )
      .lean();
    return conversationUpdated;
  }
}
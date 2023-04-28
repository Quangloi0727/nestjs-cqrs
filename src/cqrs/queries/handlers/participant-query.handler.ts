import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { Participant, ParticipantDocument } from '../../../schemas'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AllParticipantQuery } from '../participant.query'

@QueryHandler(AllParticipantQuery)
export class ParticipantQueryHandler
  implements IQueryHandler<AllParticipantQuery, ParticipantDocument[]>
{
  constructor(
    @InjectModel(Participant.name)
    private readonly model: Model<ParticipantDocument>,
  ) { }

  async execute(query: AllParticipantQuery): Promise<ParticipantDocument[]> {
    if (query.agentId) return this.model.findOne({ cloudAgentId: query.agentId })
    return await this.model.find().exec()
  }

}

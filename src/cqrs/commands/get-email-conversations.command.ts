import { ICommand } from '@nestjs/cqrs';

export class GetEmailConversationsCommand implements ICommand {
  constructor(
    public tenantId: number,
    public query: string,
    public agentId: string,
    public onlySpam: boolean,
    public onlyUnread: boolean,
    public skip: number,
    public take: number,
    public emails: string,
    public fromDate: Date,
    public toDate: Date,
  ) {}
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Attachment, EmailDto } from '../message-consumer';
import { BaseObject } from '../common/base/base-object';
import { SendEmailDto } from '../facade-rest-api/dtos/send-email.dto';

export type EmailDocument = Email & Document;

@Schema({ collection: 'email' })
export class Email extends BaseObject<Email> {
  @Prop()
  CreationTime: Date;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailConversation',
    index: true,
  })
  conversationId: string;
  @Prop()
  LastModificationTime: Date;
  @Prop({ default: false })
  IsDeleted: boolean;
  @Prop()
  DeletionTime: Date;
  @Prop()
  TenantId: number;
  @Prop()
  Subject: string;
  @Prop()
  FromEmail: string;
  @Prop()
  ToEmail: string;
  @Prop()
  CcEmail: string;
  @Prop()
  BccEmail: string;
  @Prop()
  Content: string;
  @Prop({ length: 50 })
  Status: string;
  @Prop()
  ReceivedTime: Date;
  @Prop()
  RelatedEmailId: string;
  @Prop({ default: 'inbound' })
  Direction: string;
  @Prop()
  SlaStatus: boolean;
  @Prop()
  Reader: number;
  @Prop()
  ReadTime: Date;
  @Prop()
  SenderName: string;
  @Prop()
  SentTime: Date;
  @Prop({ type: Object })
  attachments: Attachment[];

  static fromDto(dto: EmailDto) {
    return new Email({
      CreationTime: new Date(),
      Subject: dto.subject,
      SenderName: this.getEmailName(dto.from),
      FromEmail: this.checkAndParseEmailAddress(dto.from),
      ToEmail: this.checkAndParseEmailAddress(dto.to),
      CcEmail: this.checkAndParseEmailAddress(dto.cc),
      BccEmail: this.checkAndParseEmailAddress(dto.bcc),
      TenantId: dto.tenantId,
      Content: dto.html,
      ReceivedTime: new Date((dto.ctime ?? 0) * 1000),
      attachments: dto.attachments,
    });
  }

  static fromSendEmailRequestDto(dto: SendEmailDto) {
    const now = new Date();
    return new Email({
      CreationTime: now,
      conversationId: dto.conversationId,
      Subject: dto.subject,
      SenderName: dto.sender,
      FromEmail: dto.email,
      Direction: 'outbound',
      ToEmail: dto.to,
      CcEmail: dto.cc,
      BccEmail: dto.bcc,
      Content: dto.body,
      ReceivedTime: now,
      SentTime: now,
      attachments: dto.attachments?.map((a) => {
        return {
          name: a.name,
          size: a.buffer.length,
          relPath: `static/email/${
            dto.email
          }/${now.getFullYear()}/${now.toLocaleString('en-us', {
            month: 'short',
          })}/${now.toLocaleString('en-us', {
            day: '2-digit',
          })}/${a.name}`,
        } as Attachment;
      }),
    });
  }

  static getEmailName(inputString: string): string {
    if (!inputString) return inputString;
    const regex = /([^<]+)\s*</g;
    const names: string[] = [];
    let match;

    while ((match = regex.exec(inputString))) {
      const name = match[1].trim();
      names.push(name);
    }
    if (names.length) return names.join(',');
    return inputString;
  }

  static checkAndParseEmailAddress(inputString: string): string {
    if (!inputString) return inputString;
    const emails = [];
    for (const e of inputString.split(',')) {
      const regex = /[^\s<>]+@[^\s<>]+/g;
      const results = e.match(regex);
      if (results) emails.push(results.join(','));
      else emails.push(e);
    }
    return emails.join(',');
  }
}

export const EmailSchema = SchemaFactory.createForClass(Email);

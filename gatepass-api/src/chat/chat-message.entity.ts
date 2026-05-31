import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'thread_key', length: 120 })
  threadKey: string;

  @Column({ name: 'sender_role', length: 20 })
  senderRole: string;

  @Column({ name: 'sender_unit', type: 'varchar', length: 20, nullable: true, default: null })
  senderUnit: string | null;

  @Column({ name: 'recipient_role', length: 20 })
  recipientRole: string;

  @Column({ name: 'recipient_unit', type: 'varchar', length: 20, nullable: true, default: null })
  recipientUnit: string | null;

  @Column({ name: 'sender_name', type: 'varchar', length: 60, nullable: true, default: null })
  senderName: string | null;

  @Column({ type: 'text', default: '' })
  text: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  attachment: Record<string, unknown> | null;

  @Column({ length: 20, default: 'sent' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;
}

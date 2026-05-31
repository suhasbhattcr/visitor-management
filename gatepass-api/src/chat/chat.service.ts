import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
  ) {}

  save(message: {
    id: string;
    threadKey: string;
    senderRole: string;
    senderUnit: string | null;
    senderName?: string | null;
    recipientRole: string;
    recipientUnit: string | null;
    text: string;
    attachment: Record<string, unknown> | null;
  }) {
    return this.repo.save({
      id: message.id,
      threadKey: message.threadKey,
      senderRole: message.senderRole,
      senderUnit: message.senderUnit ?? null,
      senderName: message.senderName ?? null,
      recipientRole: message.recipientRole,
      recipientUnit: message.recipientUnit ?? null,
      text: message.text ?? '',
      attachment: message.attachment ?? null,
      status: 'sent',
    });
  }

  /** Fetch recent messages for a thread (newest-last order, cap at 100) */
  async getThreadHistory(threadKey: string, limit = 100): Promise<ChatMessage[]> {
    const rows = await this.repo.find({
      where: { threadKey },
      order: { created_at: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  /**
   * Fetch all thread keys + their latest message timestamp for a unit,
   * so clients can know which threads exist when they reconnect.
   */
  async getThreadsForUnit(unit: string): Promise<string[]> {
    const upper = String(unit).trim().toUpperCase();
    const rows: { thread_key: string }[] = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.thread_key', 'thread_key')
      .where('m.sender_unit = :u OR m.recipient_unit = :u', { u: upper })
      .getRawMany();
    return rows.map((r) => r.thread_key);
  }

  /**
   * For a specific security officer: return their private chat history
   * (threads where they are sender or recipient, plus their sec-sec threads).
   */
  async getHistoryForOfficer(officerId: string, limitPerThread = 100): Promise<ChatMessage[]> {
    if (!officerId) return [];
    // Find thread keys involving this officer
    const rows: { thread_key: string }[] = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.thread_key', 'thread_key')
      .where(
        `(m.thread_key LIKE :secPattern OR m.thread_key LIKE :secPattern2 OR m.sender_unit = :oid OR m.recipient_unit = :oid)`,
        {
          secPattern: `security:${officerId}:%`,
          secPattern2: `sec-sec:%${officerId}%`,
          oid: officerId,
        },
      )
      .getRawMany();

    const threadKeys = rows
      .map((r) => r.thread_key)
      .filter((k) => {
        if (k.startsWith(`security:${officerId}:`)) return true;
        if (k.startsWith('sec-sec:')) {
          const parts = k.split(':');
          return parts[1] === officerId || parts[2] === officerId;
        }
        return false;
      });

    const histories = await Promise.all(
      threadKeys.map((key) => this.getThreadHistory(key, limitPerThread)),
    );
    return histories
      .flat()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
}

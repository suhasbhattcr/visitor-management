import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { AppGateway } from '../gateway/app.gateway';

// LRU-like dedup cache: Map preserves insertion order, O(1) ops
const DEDUP_LIMIT = 500;

@Injectable()
export class DeliverySubscriberService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly channel: string;
  private readonly seenEvents = new Map<string, 1>();

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: AppGateway,
  ) {
    this.channel = this.config.get<string>('DELIVERY_EVENTS_CHANNEL') ?? 'delivery-events';
  }

  async onModuleInit() {
    this.client = createClient({
      url: this.config.get<string>('REDIS_URL'),
    }) as RedisClientType;

    this.client.on('error', (err: Error) => {
      console.error('[redis:subscriber] error:', err.message);
    });

    await this.client.connect();

    await this.client.subscribe(this.channel, (message) => {
      this.handleMessage(message);
    });

    console.log(`[redis:subscriber] subscribed to "${this.channel}"`);
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.unsubscribe(this.channel).catch(() => null);
      await this.client.quit();
    }
  }

  private handleMessage(raw: string) {
    let event: { type: string; payload?: { id?: number; unit?: string } };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (!event?.type) return;

    const key = `${event.type}:${event.payload?.id ?? 'x'}`;
    if (this.isDuplicate(key)) return;

    this.gateway.broadcastDeliveryEvent(event);
  }

  private isDuplicate(key: string): boolean {
    if (this.seenEvents.has(key)) return true;
    this.seenEvents.set(key, 1);
    if (this.seenEvents.size > DEDUP_LIMIT) {
      this.seenEvents.delete(this.seenEvents.keys().next().value as string);
    }
    return false;
  }
}

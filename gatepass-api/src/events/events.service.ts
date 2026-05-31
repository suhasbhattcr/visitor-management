import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly channel: string;

  constructor(private readonly config: ConfigService) {
    this.channel = this.config.get<string>('DELIVERY_EVENTS_CHANNEL') ?? 'delivery-events';
  }

  async onModuleInit() {
    this.client = createClient({
      url: this.config.get<string>('REDIS_URL'),
    }) as RedisClientType;

    this.client.on('error', (err: Error) => {
      console.error('[redis:publisher] error:', err.message);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async publish(type: string, payload: unknown): Promise<void> {
    if (!this.client?.isOpen) {
      console.warn('[redis:publisher] client not open, skipping event:', type);
      return;
    }
    try {
      await this.client.publish(
        this.channel,
        JSON.stringify({ type, timestamp: new Date().toISOString(), payload }),
      );
    } catch (err: unknown) {
      console.error('[redis:publisher] publish failed:', (err as Error).message);
    }
  }
}

import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { DeliverySubscriberService } from './delivery-subscriber.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  providers: [EventsService, DeliverySubscriberService],
  exports: [EventsService],
})
export class EventsModule {}

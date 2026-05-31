import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ChatModule, UsersModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}


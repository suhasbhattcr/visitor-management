import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './deliveries/delivery.entity';
import { WatchlistEntry } from './watchlist/watchlist.entity';
import { Preregistration } from './preregistrations/preregistration.entity';
import { UnitInstruction } from './instructions/unit-instruction.entity';
import { ChatMessage } from './chat/chat-message.entity';
import { User } from './users/user.entity';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PreregistrationsModule } from './preregistrations/preregistrations.module';
import { InstructionsModule } from './instructions/instructions.module';
import { EventsModule } from './events/events.module';
import { GatewayModule } from './gateway/gateway.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Delivery, WatchlistEntry, Preregistration, UnitInstruction, ChatMessage, User],
        synchronize: false, // schema managed by db/init SQL scripts
        extra: {
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 3_000,
          statement_timeout: 10_000,
        },
      }),
    }),

    DeliveriesModule,
    WatchlistModule,
    PreregistrationsModule,
    InstructionsModule,
    EventsModule,
    GatewayModule,
    ChatModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistEntry } from './watchlist.entity';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WatchlistEntry])],
  providers: [WatchlistService],
  controllers: [WatchlistController],
})
export class WatchlistModule {}

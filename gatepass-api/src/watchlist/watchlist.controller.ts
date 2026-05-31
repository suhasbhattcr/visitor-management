import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  // Must be declared before :id route
  @Get('check')
  check(@Query('name') name?: string, @Query('phone') phone?: string) {
    return this.watchlistService.check(name, phone);
  }

  @Get()
  findAll() {
    return this.watchlistService.findAll();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateWatchlistDto) {
    return this.watchlistService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.watchlistService.remove(id);
  }
}

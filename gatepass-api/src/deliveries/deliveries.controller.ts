import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('recent-visitors')
  findRecentVisitors() {
    return this.deliveriesService.findRecentVisitors();
  }

  @Get()
  findAll(@Query() query: QueryDeliveryDto) {
    return this.deliveriesService.findAll(query);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.createMany(dto);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.reject(id);
  }

  @Post(':id/exit-visitor')
  exitVisitor(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.exitVisitor(id);
  }
}

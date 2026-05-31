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
import { PreregistrationsService } from './preregistrations.service';
import { CreatePreregistrationDto } from './dto/create-preregistration.dto';

@Controller('preregistrations')
export class PreregistrationsController {
  constructor(private readonly preregistrationsService: PreregistrationsService) {}

  @Get()
  findAll(@Query('unit') unit?: string, @Query('date') date?: string) {
    return this.preregistrationsService.findAll(unit, date);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePreregistrationDto) {
    return this.preregistrationsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preregistrationsService.remove(id);
  }
}

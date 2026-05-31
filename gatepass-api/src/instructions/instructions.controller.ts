import { BadRequestException, Body, Controller, Get, Put, Query } from '@nestjs/common';
import { InstructionsService } from './instructions.service';
import { SaveInstructionDto } from './dto/save-instruction.dto';

@Controller('instructions')
export class InstructionsController {
  constructor(private readonly instructionsService: InstructionsService) {}

  // Must be declared before any /:param route
  @Get('multi')
  async findMultiple(@Query('units') units?: string) {
    const unitList = (units ?? '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const instructions = await this.instructionsService.findMultiple(unitList);
    return { instructions };
  }

  @Get()
  async findOne(@Query('unit') unit?: string) {
    if (!unit) throw new BadRequestException('unit query param is required');
    const instructions = await this.instructionsService.findOne(unit);
    return { instructions };
  }

  @Put()
  async upsert(@Body() dto: SaveInstructionDto) {
    const instructions = await this.instructionsService.upsert(
      dto.unit,
      dto.instructions ?? '',
    );
    return { instructions };
  }
}

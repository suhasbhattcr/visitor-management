import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitInstruction } from './unit-instruction.entity';
import { InstructionsService } from './instructions.service';
import { InstructionsController } from './instructions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UnitInstruction])],
  providers: [InstructionsService],
  controllers: [InstructionsController],
})
export class InstructionsModule {}

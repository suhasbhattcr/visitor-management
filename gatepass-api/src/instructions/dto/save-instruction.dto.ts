import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveInstructionDto {
  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

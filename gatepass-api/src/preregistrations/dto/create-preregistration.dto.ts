import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePreregistrationDto {
  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  visitor_name: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsDateString()
  expected_date: string;
}

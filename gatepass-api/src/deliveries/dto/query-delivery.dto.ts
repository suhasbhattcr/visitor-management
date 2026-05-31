import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryDeliveryDto {
  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  approval_status?: string;

  @IsOptional()
  @IsString()
  delivery_status?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  gate?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

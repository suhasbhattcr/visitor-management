import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  @IsNotEmpty()
  person_name: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  added_by?: string;
}

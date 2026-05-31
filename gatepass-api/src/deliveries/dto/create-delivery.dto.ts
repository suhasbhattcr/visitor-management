import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  delivery_person_name: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsArray()
  @ArrayMinSize(1)
  units: string[];

  @IsOptional()
  @IsString()
  parcel_image?: string;

  @IsOptional()
  @IsString()
  gate?: string;

  @IsOptional()
  @IsString()
  visitor_category?: string;

  @IsOptional()
  @IsString()
  vehicle_number?: string;
}

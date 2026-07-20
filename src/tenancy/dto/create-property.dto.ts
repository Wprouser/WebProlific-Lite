import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PROPERTY_TYPES, PropertyType } from '../constants/enums';

export class CreatePropertyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(PROPERTY_TYPES)
  type!: PropertyType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

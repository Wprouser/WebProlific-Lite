import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PROPERTY_TYPES, PropertyType } from '../constants/enums';

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(PROPERTY_TYPES)
  type?: PropertyType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

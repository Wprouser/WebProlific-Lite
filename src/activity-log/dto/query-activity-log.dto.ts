import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ACTIVITY_CATEGORIES, ActivityCategory } from '../constants/enums';

export class QueryActivityLogDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  chainId?: string;

  @IsOptional()
  @IsIn(ACTIVITY_CATEGORIES)
  category?: ActivityCategory;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;
}

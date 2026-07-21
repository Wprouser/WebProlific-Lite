import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ENTITY_CATEGORIES, EntityCategory } from '../constants/enums';

export class QueryTransactionLogDto {
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
  @IsIn(ENTITY_CATEGORIES)
  entityCategory?: EntityCategory;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;
}

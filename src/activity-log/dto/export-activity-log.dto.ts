import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ACTIVITY_CATEGORIES, ActivityCategory } from '../constants/enums';

const EXPORT_FORMATS = ['pdf', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ExportActivityLogDto {
  @IsIn(EXPORT_FORMATS)
  format!: ExportFormat;

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

import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { TRANSACTION_TYPES, TransactionType } from '../constants/enums';

export class QueryStockTransactionsDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  // Same usability addition as QueryItemsDto.outletId — not in the spec's
  // literal filter list, but a multi-outlet user has no other way to
  // narrow the list to one outlet.
  @IsOptional()
  @IsString()
  outletId?: string;
}

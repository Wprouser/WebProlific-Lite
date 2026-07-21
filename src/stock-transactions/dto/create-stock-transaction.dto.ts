import { IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { REASON_CODES, REFERENCE_TYPES, ReasonCode, ReferenceType, TRANSACTION_TYPES, TransactionType } from '../constants/enums';

export class CreateStockTransactionDto {
  @IsString()
  itemId!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: TransactionType;

  // Format only — the ">0" business rule is checked in the service, same
  // split as CreateItemDto's minStock/maxStock.
  @Matches(/^\d+(\.\d{1,3})?$/, { message: 'quantity must be a decimal with up to 3 places' })
  quantity!: string;

  @IsOptional()
  @IsIn(REFERENCE_TYPES)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsIn(REASON_CODES)
  reasonCode?: ReasonCode;

  // Spec: only honored if the requester's role at this outlet is
  // OUTLET_MANAGER+ — see StockTransactionsService.
  @IsOptional()
  @IsBoolean()
  forceOverride?: boolean;
}

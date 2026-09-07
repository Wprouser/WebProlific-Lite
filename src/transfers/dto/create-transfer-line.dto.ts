import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateTransferLineDto {
  /** The item as it exists at the source outlet. */
  @IsString()
  itemId!: string;

  @Matches(/^\d+(\.\d{1,3})?$/, { message: 'quantity must be a decimal with up to 3 places' })
  quantity!: string;

  /**
   * The matching item at the destination outlet. Optional: if omitted,
   * TransfersService attempts to resolve it (barcode, then fuzzy name match
   * against the destination outlet's catalogue) and rejects the whole
   * request naming this line's item if nothing can be confidently
   * identified — see resolve-dest-item.ts. Supplying it explicitly is what
   * lets the Transfer builder screen's picker override a wrong or missing
   * auto-suggestion.
   */
  @IsOptional()
  @IsString()
  destItemId?: string;
}

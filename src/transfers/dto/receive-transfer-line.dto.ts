import { IsString, Matches } from 'class-validator';

export class ReceiveTransferLineDto {
  @IsString()
  transferLineId!: string;

  // Zero is valid and meaningful here — a line that arrived entirely
  // damaged/lost. TransfersService, not this format check, decides what a
  // zero receipt means for the underlying stock movement.
  @Matches(/^\d+(\.\d{1,3})?$/, { message: 'actualReceivedQty must be a decimal with up to 3 places' })
  actualReceivedQty!: string;
}

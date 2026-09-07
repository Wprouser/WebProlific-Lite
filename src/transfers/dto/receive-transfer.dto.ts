import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { ReceiveTransferLineDto } from './receive-transfer-line.dto';

export class ReceiveTransferDto {
  /**
   * One entry per transfer line — required for every line, not optional per
   * line, matching GRN's own receiving pattern (every GRNLine gets an
   * explicit receivedQty, never an implicit "assume it all arrived"). See
   * TransfersService.receive for how it validates the set matches exactly.
   */
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferLineDto)
  lines!: ReceiveTransferLineDto[];
}

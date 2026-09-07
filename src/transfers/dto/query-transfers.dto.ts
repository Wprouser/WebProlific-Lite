import { IsIn, IsOptional, IsString } from 'class-validator';
import { TRANSFER_STATUSES } from '../constants/enums';

export class QueryTransfersDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsIn(TRANSFER_STATUSES)
  status?: string;
}

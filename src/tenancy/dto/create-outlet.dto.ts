import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { OUTLET_TYPES, OutletType } from '../constants/enums';

export class CreateOutletDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(OUTLET_TYPES)
  type!: OutletType;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'poApprovalThreshold must be a decimal with up to 2 places',
  })
  poApprovalThreshold?: string;
}

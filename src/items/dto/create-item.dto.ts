import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UNITS, Unit } from '../constants/enums';

export class CreateItemDto {
  // Not in the spec's illustrative request body, but Item.outletId is a
  // required schema field with no route param to source it from (FR-01's
  // endpoints are flat, unlike Outlet's own /properties/:propertyId/outlets
  // nesting) — so it belongs in the body, same as FR-13's
  // `body.chainId` precedent.
  @IsString()
  outletId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'sku must be alphanumeric with hyphens only' })
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsIn(UNITS)
  unit!: Unit;

  @Matches(/^\d+(\.\d{1,3})?$/, { message: 'minStock must be a decimal with up to 3 places' })
  minStock!: string;

  @Matches(/^\d+(\.\d{1,3})?$/, { message: 'maxStock must be a decimal with up to 3 places' })
  maxStock!: string;

  @IsOptional()
  @IsInt()
  shelfLifeDays?: number;

  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'costPrice must be a decimal with up to 2 places' })
  costPrice!: string;

  @IsOptional()
  @IsString()
  defaultSupplierId?: string;

  @IsOptional()
  @IsString()
  storageLocation?: string;
}

import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class QueryItemsDto {
  // Not in the spec's literal filter list, but items are always
  // outlet-scoped and a multi-outlet user (PROPERTY_MANAGER+) has no other
  // way to narrow the list to one outlet — added for usability, doesn't
  // change the scoping rule itself (still bounded by effectiveOutletIds).
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  belowMinStock?: string;
}

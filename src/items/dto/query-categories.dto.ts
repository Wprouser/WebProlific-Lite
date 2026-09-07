import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class QueryCategoriesDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  // Omitted = both active and inactive rows — the Category Management
  // screen needs to show deactivated categories too, not just what's
  // currently selectable on the Item form.
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

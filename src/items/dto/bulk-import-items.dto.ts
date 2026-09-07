import { IsString } from 'class-validator';

/** Multipart companion to the uploaded file — the outlet these items belong
 * to, which a CSV/Excel file never carries itself. */
export class BulkImportItemsDto {
  @IsString()
  outletId!: string;
}

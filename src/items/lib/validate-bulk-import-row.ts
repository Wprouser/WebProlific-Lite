import { ParsedItemRow } from './parse-items-file';

/**
 * FR-01 bulk import: per-row validation and name→id resolution, kept as a
 * pure function (no DB access of its own — the outlet's categories/units/
 * suppliers/tax rates are loaded once by the service and handed in as
 * lookup maps) so every row of a potentially large file is checked
 * synchronously and cheaply. Global SKU/barcode uniqueness against
 * *existing* items still needs a DB round-trip and is checked by the
 * service after this passes — see ItemsService.bulkImport.
 *
 * Returns exactly one error per invalid row (matching the spec's own
 * illustrative shape, `{row: 5, error: "duplicate SKU"}`), not a list of
 * every problem with that row — the first failure found is reported.
 */

export interface BulkImportNameLookups {
  /** Keyed by lower-cased name. */
  categoryIdByName: Map<string, string>;
  unitIdByName: Map<string, string>;
  supplierIdByName: Map<string, string>;
  taxRateIdByName: Map<string, string>;
}

export interface ResolvedBulkImportRow {
  rowNumber: number;
  name: string;
  categoryId: string;
  sku: string;
  barcode?: string;
  unitId: string;
  minStock: string;
  maxStock: string;
  shelfLifeDays?: number;
  costPrice: string;
  purchaseGLAccount?: string;
  defaultTaxRateId?: string;
  defaultSupplierId?: string;
  storageLocation?: string;
  openingStock?: { quantity: string; ratePerUnit?: string };
}

export type ValidateRowResult = { success: true; row: ResolvedBulkImportRow } | { success: false; error: string };

export function validateBulkImportRow(
  row: ParsedItemRow,
  lookups: BulkImportNameLookups,
  // Mutated in place as rows validate — the caller processes rows in file
  // order, so a later row correctly sees an earlier row's SKU/barcode.
  seenSkus: Set<string>,
  seenBarcodes: Set<string>,
): ValidateRowResult {
  if (row.name.length < 2 || row.name.length > 120) {
    return { success: false, error: 'name must be between 2 and 120 characters' };
  }

  if (!row.category) return { success: false, error: 'category is required' };
  const categoryId = lookups.categoryIdByName.get(row.category.toLowerCase());
  if (!categoryId) return { success: false, error: `Category "${row.category}" was not found (or is inactive) for this outlet` };

  if (!/^[A-Za-z0-9-]+$/.test(row.sku)) {
    return { success: false, error: 'sku must be alphanumeric with hyphens only' };
  }
  const skuKey = row.sku.toLowerCase();
  if (seenSkus.has(skuKey)) return { success: false, error: `duplicate SKU "${row.sku}" within this file` };

  if (row.barcode && seenBarcodes.has(row.barcode.toLowerCase())) {
    return { success: false, error: `duplicate barcode "${row.barcode}" within this file` };
  }

  if (!row.unit) return { success: false, error: 'unit is required' };
  const unitId = lookups.unitIdByName.get(row.unit.toLowerCase());
  if (!unitId) return { success: false, error: `Unit "${row.unit}" was not found (or is inactive) for this outlet` };

  if (!/^\d+(\.\d{1,3})?$/.test(row.minStock)) return { success: false, error: 'minStock must be a decimal with up to 3 places' };
  if (!/^\d+(\.\d{1,3})?$/.test(row.maxStock)) return { success: false, error: 'maxStock must be a decimal with up to 3 places' };
  if (Number(row.minStock) >= Number(row.maxStock)) return { success: false, error: 'minStock must be less than maxStock' };

  if (!/^\d+(\.\d{1,2})?$/.test(row.costPrice)) return { success: false, error: 'costPrice must be a decimal with up to 2 places' };

  let shelfLifeDays: number | undefined;
  if (row.shelfLifeDays) {
    if (!/^\d+$/.test(row.shelfLifeDays)) return { success: false, error: 'shelfLifeDays must be a whole number' };
    shelfLifeDays = Number(row.shelfLifeDays);
  }

  let defaultSupplierId: string | undefined;
  if (row.defaultSupplier) {
    defaultSupplierId = lookups.supplierIdByName.get(row.defaultSupplier.toLowerCase());
    if (!defaultSupplierId) {
      return { success: false, error: `Supplier "${row.defaultSupplier}" was not found (or is inactive) for this outlet` };
    }
  }

  let defaultTaxRateId: string | undefined;
  if (row.defaultTaxRate) {
    defaultTaxRateId = lookups.taxRateIdByName.get(row.defaultTaxRate.toLowerCase());
    if (!defaultTaxRateId) {
      return { success: false, error: `Tax rate "${row.defaultTaxRate}" was not found (or is inactive) for this outlet` };
    }
  }

  let openingStock: { quantity: string; ratePerUnit?: string } | undefined;
  if (row.openingStockQuantity) {
    if (!/^\d+(\.\d{1,3})?$/.test(row.openingStockQuantity)) {
      return { success: false, error: 'openingStockQuantity must be a decimal with up to 3 places' };
    }
    if (row.openingStockRatePerUnit && !/^\d+(\.\d{1,2})?$/.test(row.openingStockRatePerUnit)) {
      return { success: false, error: 'openingStockRatePerUnit must be a decimal with up to 2 places' };
    }
    openingStock = { quantity: row.openingStockQuantity, ratePerUnit: row.openingStockRatePerUnit ?? undefined };
  }

  seenSkus.add(skuKey);
  if (row.barcode) seenBarcodes.add(row.barcode.toLowerCase());

  return {
    success: true,
    row: {
      rowNumber: row.rowNumber,
      name: row.name,
      categoryId,
      sku: row.sku,
      barcode: row.barcode ?? undefined,
      unitId,
      minStock: row.minStock,
      maxStock: row.maxStock,
      shelfLifeDays,
      costPrice: row.costPrice,
      purchaseGLAccount: row.purchaseGLAccount ?? undefined,
      defaultTaxRateId,
      defaultSupplierId,
      storageLocation: row.storageLocation ?? undefined,
      openingStock,
    },
  };
}

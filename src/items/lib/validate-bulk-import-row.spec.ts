import { ParsedItemRow } from './parse-items-file';
import { BulkImportNameLookups, ValidateRowResult, validateBulkImportRow } from './validate-bulk-import-row';

function fixtureRow(overrides: Partial<ParsedItemRow> = {}): ParsedItemRow {
  return {
    rowNumber: 1,
    name: 'Basmati Rice',
    category: 'Dry Goods',
    sku: 'RICE-001',
    barcode: null,
    unit: 'Kilogram',
    minStock: '10',
    maxStock: '100',
    shelfLifeDays: null,
    costPrice: '85.50',
    purchaseGLAccount: null,
    defaultTaxRate: null,
    defaultSupplier: null,
    storageLocation: null,
    openingStockQuantity: null,
    openingStockRatePerUnit: null,
    ...overrides,
  };
}

function fixtureLookups(overrides: Partial<BulkImportNameLookups> = {}): BulkImportNameLookups {
  return {
    categoryIdByName: new Map([['dry goods', 'cat1']]),
    unitIdByName: new Map([['kilogram', 'unit1']]),
    supplierIdByName: new Map([['al-fahad trading', 'sup1']]),
    taxRateIdByName: new Map([['vat 15%', 'tax1']]),
    ...overrides,
  };
}

function errorOf(result: ValidateRowResult): string | undefined {
  return result.success ? undefined : result.error;
}

describe('validateBulkImportRow', () => {
  function run(row: ParsedItemRow, lookups = fixtureLookups(), skus = new Set<string>(), barcodes = new Set<string>()) {
    return validateBulkImportRow(row, lookups, skus, barcodes);
  }

  it('AC: resolves category/unit names to ids for a valid row', () => {
    const result = run(fixtureRow());
    expect(result.success).toBe(true);
    expect(result.success && result.row).toMatchObject({ categoryId: 'cat1', unitId: 'unit1', sku: 'RICE-001' });
  });

  it('resolves optional defaultSupplier/defaultTaxRate names when present', () => {
    const result = run(fixtureRow({ defaultSupplier: 'Al-Fahad Trading', defaultTaxRate: 'VAT 15%' }));
    expect(result.success && result.row).toMatchObject({ defaultSupplierId: 'sup1', defaultTaxRateId: 'tax1' });
  });

  it('resolves openingStock when a quantity is present', () => {
    const result = run(fixtureRow({ openingStockQuantity: '25', openingStockRatePerUnit: '85.50' }));
    expect(result.success && result.row.openingStock).toEqual({ quantity: '25', ratePerUnit: '85.50' });
  });

  it('name-matching is case-insensitive', () => {
    const result = run(fixtureRow({ category: 'DRY GOODS', unit: 'kilogram' }));
    expect(result.success).toBe(true);
  });

  it('rejects a name that is too short', () => {
    expect(errorOf(run(fixtureRow({ name: 'A' })))).toMatch(/name/);
  });

  it('AC: rejects a category that does not resolve to a known name', () => {
    expect(errorOf(run(fixtureRow({ category: 'Nonexistent' })))).toMatch(/Category "Nonexistent"/);
  });

  it('AC: rejects a unit that does not resolve to a known name', () => {
    expect(errorOf(run(fixtureRow({ unit: 'Nonexistent' })))).toMatch(/Unit "Nonexistent"/);
  });

  it('rejects an unresolvable defaultSupplier name', () => {
    expect(errorOf(run(fixtureRow({ defaultSupplier: 'Nonexistent' })))).toMatch(/Supplier "Nonexistent"/);
  });

  it('rejects an unresolvable defaultTaxRate name', () => {
    expect(errorOf(run(fixtureRow({ defaultTaxRate: 'Nonexistent' })))).toMatch(/Tax rate "Nonexistent"/);
  });

  it('rejects a sku with invalid characters', () => {
    expect(errorOf(run(fixtureRow({ sku: 'RICE 001!' })))).toMatch(/sku/);
  });

  it('AC: rejects a duplicate SKU within the same file', () => {
    const skus = new Set(['rice-001']);
    expect(errorOf(run(fixtureRow(), fixtureLookups(), skus))).toMatch(/duplicate SKU/);
  });

  it('rejects a duplicate barcode within the same file', () => {
    const barcodes = new Set(['8901030123456']);
    expect(errorOf(run(fixtureRow({ barcode: '8901030123456' }), fixtureLookups(), new Set(), barcodes))).toMatch(
      /duplicate barcode/,
    );
  });

  it('rejects minStock >= maxStock', () => {
    expect(errorOf(run(fixtureRow({ minStock: '100', maxStock: '100' })))).toMatch(/minStock must be less than maxStock/);
  });

  it('rejects a malformed minStock/maxStock/costPrice decimal', () => {
    expect(errorOf(run(fixtureRow({ minStock: 'abc' })))).toMatch(/minStock/);
    expect(errorOf(run(fixtureRow({ maxStock: 'abc' })))).toMatch(/maxStock/);
    expect(errorOf(run(fixtureRow({ costPrice: 'abc' })))).toMatch(/costPrice/);
  });

  it('rejects a non-integer shelfLifeDays', () => {
    expect(errorOf(run(fixtureRow({ shelfLifeDays: '30.5' })))).toMatch(/shelfLifeDays/);
  });

  it('rejects a malformed openingStock quantity/rate', () => {
    expect(errorOf(run(fixtureRow({ openingStockQuantity: 'abc' })))).toMatch(/openingStockQuantity/);
    expect(
      errorOf(run(fixtureRow({ openingStockQuantity: '25', openingStockRatePerUnit: 'abc' }))),
    ).toMatch(/openingStockRatePerUnit/);
  });

  it('records a validated row\'s SKU/barcode into the seen sets, so a later row in the same file catches the duplicate', () => {
    const skus = new Set<string>();
    const barcodes = new Set<string>();
    const lookups = fixtureLookups();
    const first = run(fixtureRow({ barcode: '8901030123456' }), lookups, skus, barcodes);
    expect(first.success).toBe(true);

    const second = run(fixtureRow({ rowNumber: 2 }), lookups, skus, barcodes);
    expect(errorOf(second)).toMatch(/duplicate SKU/);
  });
});

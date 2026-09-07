import { Workbook } from 'exceljs';
import { splitCsvLine, cellToText } from '../../sales/lib/parse-sales-file';

/**
 * FR-01's bulk item import: turn an uploaded CSV/Excel file into raw rows
 * for `ItemsService.bulkImport` to validate. Unlike FR-06's sales importer,
 * this is an **all-or-nothing** import (spec: "validate every row before
 * committing any... rather than partial success") — so, deliberately unlike
 * `parse-sales-file.ts`, a row that's missing a required value is not
 * silently skipped here; it's still returned as a row, and it becomes a
 * per-row validation error downstream. Only genuinely blank lines (no
 * content at all) are dropped, since they're spacing, not data.
 *
 * Nothing here touches the database or resolves category/unit/supplier/tax
 * names to ids — that needs outlet-scoped lookups the parser has no access
 * to, and keeping this a pure text transformation is what makes it cheap to
 * test independently of the service.
 */

export interface ParsedItemRow {
  /** 1-based position among data rows (the header line is not counted). */
  rowNumber: number;
  name: string;
  category: string;
  sku: string;
  barcode: string | null;
  unit: string;
  minStock: string;
  maxStock: string;
  shelfLifeDays: string | null;
  costPrice: string;
  purchaseGLAccount: string | null;
  defaultTaxRate: string | null;
  defaultSupplier: string | null;
  storageLocation: string | null;
  openingStockQuantity: string | null;
  openingStockRatePerUnit: string | null;
}

export class ItemsFileFormatError extends Error {}

const HEADER_ALIASES: Record<keyof Omit<ParsedItemRow, 'rowNumber'>, string[]> = {
  name: ['name', 'itemname', 'item', 'productname', 'description'],
  category: ['category', 'categoryname'],
  sku: ['sku', 'itemcode', 'code', 'productcode'],
  barcode: ['barcode', 'upc', 'ean'],
  unit: ['unit', 'unitofmeasure', 'uom', 'units'],
  minStock: ['minstock', 'reorderpoint', 'minimumstock', 'min'],
  maxStock: ['maxstock', 'maximumstock', 'max'],
  shelfLifeDays: ['shelflifedays', 'shelflife'],
  costPrice: ['costprice', 'cost', 'unitcost', 'price'],
  purchaseGLAccount: ['purchaseglaccount', 'glaccount', 'ledgeraccount'],
  defaultTaxRate: ['defaulttaxrate', 'taxrate', 'tax'],
  defaultSupplier: ['defaultsupplier', 'supplier', 'preferredsupplier'],
  storageLocation: ['storagelocation', 'location'],
  openingStockQuantity: ['openingstock', 'openingstockquantity', 'openingqty', 'openingquantity'],
  openingStockRatePerUnit: ['openingstockrate', 'openingrateperunit', 'openingrate'],
};

// A header row must at least identify these — the columns most unlikely to
// appear by coincidence in a non-header line, same reasoning as FR-06's
// header-detection signal.
const REQUIRED_HEADER_FIELDS: (keyof typeof HEADER_ALIASES)[] = ['name', 'category', 'sku', 'unit'];

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

function mapColumns(headerCells: string[]): ColumnMap {
  const map: ColumnMap = {};
  headerCells.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ColumnMap, string[]][]) {
      // First match wins — same "don't let a later synonym column
      // overwrite the earlier one's mapping" rule as parse-sales-file.ts.
      if (map[field] === undefined && aliases.includes(normalized)) {
        map[field] = index;
        return;
      }
    }
  });
  return map;
}

function buildRows(grid: string[][]): ParsedItemRow[] {
  const headerIndex = grid.findIndex((cells) => {
    const map = mapColumns(cells);
    return REQUIRED_HEADER_FIELDS.every((field) => map[field] !== undefined);
  });
  if (headerIndex === -1) {
    throw new ItemsFileFormatError(
      'Could not find a header row. The file needs columns for Name, Category, SKU, and Unit at minimum.',
    );
  }

  const columns = mapColumns(grid[headerIndex]);
  const missingRequired = (['minStock', 'maxStock', 'costPrice'] as const).filter((f) => columns[f] === undefined);
  if (missingRequired.length > 0) {
    throw new ItemsFileFormatError(`Missing required column(s) in the header row: ${missingRequired.join(', ')}.`);
  }

  const rows: ParsedItemRow[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.every((cell) => cell.trim() === '')) continue; // blank separator line, not a row

    const at = (index: number | undefined) => (index === undefined ? '' : (cells[index] ?? '').trim());
    const optional = (index: number | undefined) => at(index) || null;

    rows.push({
      rowNumber: rows.length + 1,
      name: at(columns.name),
      category: at(columns.category),
      sku: at(columns.sku),
      barcode: optional(columns.barcode),
      unit: at(columns.unit),
      minStock: at(columns.minStock),
      maxStock: at(columns.maxStock),
      shelfLifeDays: optional(columns.shelfLifeDays),
      costPrice: at(columns.costPrice),
      purchaseGLAccount: optional(columns.purchaseGLAccount),
      defaultTaxRate: optional(columns.defaultTaxRate),
      defaultSupplier: optional(columns.defaultSupplier),
      storageLocation: optional(columns.storageLocation),
      openingStockQuantity: optional(columns.openingStockQuantity),
      openingStockRatePerUnit: optional(columns.openingStockRatePerUnit),
    });
  }

  if (rows.length === 0) {
    throw new ItemsFileFormatError('No data rows were found below the header.');
  }
  return rows;
}

export function parseItemsCsv(content: string): ParsedItemRow[] {
  const grid = content
    // Excel writes a UTF-8 BOM; left in place it corrupts the first header
    // cell.
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .map(splitCsvLine);
  return buildRows(grid);
}

export async function parseItemsXlsx(buffer: Buffer): Promise<ParsedItemRow[]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ItemsFileFormatError('The workbook has no sheets.');

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    const values = row.values as unknown[];
    for (let i = 1; i < values.length; i++) cells.push(cellToText(values[i]).trim());
    grid.push(cells);
  });
  return buildRows(grid);
}

/** Dispatches on file extension, falling back to CSV. */
export async function parseItemsFile(fileName: string, buffer: Buffer): Promise<ParsedItemRow[]> {
  if (/\.xlsx?$/i.test(fileName)) return parseItemsXlsx(buffer);
  return parseItemsCsv(buffer.toString('utf8'));
}

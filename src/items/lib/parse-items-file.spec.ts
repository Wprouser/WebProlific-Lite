import { ItemsFileFormatError, parseItemsCsv, parseItemsFile, parseItemsXlsx } from './parse-items-file';

const HEADER = 'Name,Category,SKU,Unit,Min Stock,Max Stock,Cost Price';

describe('parseItemsCsv', () => {
  it('parses a well-formed row using aliased headers in any order', () => {
    const csv = [
      'SKU,Name,Category,Min Stock,Max Stock,Unit,Cost Price',
      'RICE-001,Basmati Rice,Dry Goods,10,100,Kilogram,85.50',
    ].join('\n');
    const rows = parseItemsCsv(csv);
    expect(rows).toEqual([
      {
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
      },
    ]);
  });

  it('reads optional columns when present, including opening stock', () => {
    const csv = [
      `${HEADER},Barcode,Shelf Life Days,Purchase GL Account,Default Tax Rate,Default Supplier,Storage Location,Opening Stock,Opening Stock Rate`,
      'Basmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50,8901030123456,365,Cost of Goods Sold,VAT 15%,Al-Fahad Trading,Dry Store,25,85.50',
    ].join('\n');
    const [row] = parseItemsCsv(csv);
    expect(row).toMatchObject({
      barcode: '8901030123456',
      shelfLifeDays: '365',
      purchaseGLAccount: 'Cost of Goods Sold',
      defaultTaxRate: 'VAT 15%',
      defaultSupplier: 'Al-Fahad Trading',
      storageLocation: 'Dry Store',
      openingStockQuantity: '25',
      openingStockRatePerUnit: '85.50',
    });
  });

  it('skips blank separator lines without producing a row or an error', () => {
    const csv = [HEADER, 'Basmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50', '', '  ,  ,  '].join('\n');
    const rows = parseItemsCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it('does not skip a row with a missing required value — leaves it for the service to reject', () => {
    const csv = [HEADER, ',Dry Goods,RICE-001,Kilogram,10,100,85.50'].join('\n');
    const rows = parseItemsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('');
  });

  it('numbers rows 1-based among data rows only, independent of blank lines in between', () => {
    const csv = [
      HEADER,
      'Basmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50',
      '',
      'Chicken Breast,Poultry,CHKN-001,Kilogram,5,50,32.00',
    ].join('\n');
    const rows = parseItemsCsv(csv);
    expect(rows.map((r) => r.rowNumber)).toEqual([1, 2]);
  });

  it('strips a leading UTF-8 BOM before reading the header', () => {
    const csv = `\uFEFF${HEADER}\nBasmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50`;
    const rows = parseItemsCsv(csv);
    expect(rows[0]!.name).toBe('Basmati Rice');
  });

  it('throws a clear error when no header row can be found', () => {
    expect(() => parseItemsCsv('just,some,junk\n1,2,3')).toThrow(ItemsFileFormatError);
  });

  it('throws naming the specific missing required column(s)', () => {
    expect(() => parseItemsCsv('Name,Category,SKU,Unit\nBasmati Rice,Dry Goods,RICE-001,Kilogram')).toThrow(
      /Min Stock|minStock/i,
    );
  });

  it('throws when the file has a header but no data rows', () => {
    expect(() => parseItemsCsv(HEADER)).toThrow(ItemsFileFormatError);
  });

  it('handles quoted fields containing commas', () => {
    const csv = [HEADER, '"Rice, Basmati",Dry Goods,RICE-001,Kilogram,10,100,85.50'].join('\n');
    const rows = parseItemsCsv(csv);
    expect(rows[0]!.name).toBe('Rice, Basmati');
  });
});

describe('parseItemsFile', () => {
  it('dispatches .csv content to the CSV parser', async () => {
    const csv = `${HEADER}\nBasmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50`;
    const rows = await parseItemsFile('items.csv', Buffer.from(csv, 'utf8'));
    expect(rows[0]!.name).toBe('Basmati Rice');
  });

  it('falls back to CSV parsing for an unrecognized extension', async () => {
    const csv = `${HEADER}\nBasmati Rice,Dry Goods,RICE-001,Kilogram,10,100,85.50`;
    const rows = await parseItemsFile('items.txt', Buffer.from(csv, 'utf8'));
    expect(rows[0]!.name).toBe('Basmati Rice');
  });
});

describe('parseItemsXlsx', () => {
  it('parses an xlsx workbook the same way as the equivalent CSV', async () => {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Items');
    sheet.addRow(['Name', 'Category', 'SKU', 'Unit', 'Min Stock', 'Max Stock', 'Cost Price']);
    sheet.addRow(['Basmati Rice', 'Dry Goods', 'RICE-001', 'Kilogram', 10, 100, 85.5]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = await parseItemsXlsx(buffer);
    expect(rows).toEqual([
      {
        rowNumber: 1,
        name: 'Basmati Rice',
        category: 'Dry Goods',
        sku: 'RICE-001',
        barcode: null,
        unit: 'Kilogram',
        minStock: '10',
        maxStock: '100',
        shelfLifeDays: null,
        costPrice: '85.5',
        purchaseGLAccount: null,
        defaultTaxRate: null,
        defaultSupplier: null,
        storageLocation: null,
        openingStockQuantity: null,
        openingStockRatePerUnit: null,
      },
    ]);
  });

  it('throws when the workbook has no sheets', async () => {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(parseItemsXlsx(buffer)).rejects.toThrow(ItemsFileFormatError);
  });
});

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ITEM_REPOSITORY, CATEGORY_REPOSITORY, UNIT_OF_MEASURE_REPOSITORY } from '../repositories/tokens';
import { ItemRepository } from '../repositories/item.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { UnitOfMeasureRepository } from '../repositories/unit-of-measure.repository';
import { Item } from '../domain/item.entity';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { QueryItemsDto } from '../dto/query-items.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { assertOutletAccess } from '../../tenancy/access.util';
import { SUPPLIER_REPOSITORY } from '../../suppliers/repositories/tokens';
import { SupplierRepository } from '../../suppliers/repositories/supplier.repository';
import { TAX_RATE_REPOSITORY } from '../../tax-rates/repositories/tokens';
import { TaxRateRepository } from '../../tax-rates/repositories/tax-rate.repository';
import { PURCHASE_ORDER_REPOSITORY } from '../../purchase-orders/repositories/tokens';
import { PurchaseOrderRepository } from '../../purchase-orders/repositories/purchase-order.repository';
import { ItemsFileFormatError, parseItemsFile } from '../lib/parse-items-file';
import { BulkImportNameLookups, ResolvedBulkImportRow, validateBulkImportRow } from '../lib/validate-bulk-import-row';

const MUTATE_ROLES = ['CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER'] as const;

export interface BulkImportRowError {
  row: number;
  error: string;
}

export interface BulkImportItemsResult {
  createdCount: number;
  items: Item[];
}

@Injectable()
export class ItemsService {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly unitRepository: UnitOfMeasureRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly supplierRepository: SupplierRepository,
    @Inject(TAX_RATE_REPOSITORY) private readonly taxRateRepository: TaxRateRepository,
    // Not a constructor @Inject: PurchaseOrdersModule already reaches
    // ItemsModule through more than one path (directly, and via
    // TenancyModule -> StockTransactionsModule -> ItemsModule), so a
    // static import edge the other way (ItemsModule -> PurchaseOrdersModule)
    // closes a multi-hop cycle forwardRef() can't cleanly resolve here.
    // ModuleRef reads the whole app's DI container instead of this
    // module's own import graph, so no module wiring change is needed.
    private readonly moduleRef: ModuleRef,
  ) {}

  async create(request: RequestWithAccess, dto: CreateItemDto): Promise<Item> {
    assertOutletAccess(request, dto.outletId, [...MUTATE_ROLES]);
    this.assertStockRange(dto.minStock, dto.maxStock);
    await this.assertSkuAvailable(dto.sku);
    if (dto.barcode) await this.assertBarcodeAvailable(dto.barcode);

    return this.itemRepository.create({ ...dto, performedById: request.user!.id });
  }

  /**
   * Spec: "copies all master-data fields ... except sku (cleared — must be
   * set by the user, since it must be unique) and currentStock/opening
   * stock (the clone always starts at 0 — cloning an item definition is not
   * the same as duplicating its stock)." Goes through the same validated
   * create path (SKU-uniqueness etc.) rather than a raw repository insert.
   */
  async clone(request: RequestWithAccess, id: string, sku: string): Promise<Item> {
    const source = await this.getOrThrow(id);
    assertOutletAccess(request, source.outletId, [...MUTATE_ROLES]);
    await this.assertSkuAvailable(sku);

    return this.itemRepository.create({
      outletId: source.outletId,
      name: `${source.name} (Copy)`,
      categoryId: source.categoryId,
      sku,
      unitId: source.unitId,
      minStock: source.minStock,
      maxStock: source.maxStock,
      shelfLifeDays: source.shelfLifeDays ?? undefined,
      costPrice: source.costPrice,
      defaultSupplierId: source.defaultSupplierId ?? undefined,
      purchaseGLAccount: source.purchaseGLAccount ?? undefined,
      defaultTaxRateId: source.defaultTaxRateId ?? undefined,
      storageLocation: source.storageLocation ?? undefined,
      performedById: request.user!.id,
    });
  }

  /**
   * Spec: "validate every row before committing any; return a per-row
   * error report ... rather than partial success." Two phases: every row
   * is checked (name→id resolution for category/unit/supplier/tax-rate,
   * format, in-file and DB-level SKU/barcode uniqueness) before anything is
   * written; only if every row passes does the commit phase run, reusing
   * `create()` per row so bulk-imported items go through the exact same
   * validated path (including opening-stock's OPENING_BALANCE transaction)
   * as a single manual create.
   */
  async bulkImport(
    request: RequestWithAccess,
    outletId: string,
    file: { buffer: Buffer; originalName: string },
  ): Promise<BulkImportItemsResult> {
    assertOutletAccess(request, outletId, [...MUTATE_ROLES]);

    let parsedRows;
    try {
      parsedRows = await parseItemsFile(file.originalName, file.buffer);
    } catch (err) {
      if (err instanceof ItemsFileFormatError) throw new BadRequestException(err.message);
      throw err;
    }

    const scope = { accessibleOutletIds: [outletId], outletId, isActive: true };
    const [categories, units, suppliers, taxRates] = await Promise.all([
      this.categoryRepository.findScoped(scope),
      this.unitRepository.findScoped(scope),
      this.supplierRepository.findScoped(scope),
      this.taxRateRepository.findScoped(scope),
    ]);
    const lookups: BulkImportNameLookups = {
      categoryIdByName: new Map(categories.map((c) => [c.name.toLowerCase(), c.id])),
      unitIdByName: new Map(units.map((u) => [u.name.toLowerCase(), u.id])),
      supplierIdByName: new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id])),
      taxRateIdByName: new Map(taxRates.map((t) => [t.name.toLowerCase(), t.id])),
    };

    const seenSkus = new Set<string>();
    const seenBarcodes = new Set<string>();
    const errors: BulkImportRowError[] = [];
    const validRows: ResolvedBulkImportRow[] = [];

    for (const row of parsedRows) {
      const result = validateBulkImportRow(row, lookups, seenSkus, seenBarcodes);
      if (!result.success) {
        errors.push({ row: row.rowNumber, error: result.error });
        continue;
      }
      if (await this.itemRepository.findBySku(result.row.sku)) {
        errors.push({ row: row.rowNumber, error: `An item with SKU "${result.row.sku}" already exists` });
        continue;
      }
      if (result.row.barcode && (await this.itemRepository.findByBarcode(result.row.barcode))) {
        errors.push({ row: row.rowNumber, error: `An item with barcode "${result.row.barcode}" already exists` });
        continue;
      }
      validRows.push(result.row);
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Bulk import failed validation — no items were created', errors });
    }

    const items: Item[] = [];
    for (const row of validRows) {
      const item = await this.create(request, {
        outletId,
        name: row.name,
        categoryId: row.categoryId,
        sku: row.sku,
        barcode: row.barcode,
        unitId: row.unitId,
        minStock: row.minStock,
        maxStock: row.maxStock,
        shelfLifeDays: row.shelfLifeDays,
        costPrice: row.costPrice,
        defaultSupplierId: row.defaultSupplierId,
        purchaseGLAccount: row.purchaseGLAccount,
        defaultTaxRateId: row.defaultTaxRateId,
        storageLocation: row.storageLocation,
        openingStock: row.openingStock,
      } as CreateItemDto);
      items.push(item);
    }

    return { createdCount: items.length, items };
  }

  async findById(request: RequestWithAccess, id: string): Promise<Item> {
    const item = await this.getOrThrow(id);
    assertOutletAccess(request, item.outletId);
    return item;
  }

  async update(request: RequestWithAccess, id: string, dto: UpdateItemDto): Promise<Item> {
    const existing = await this.getOrThrow(id);
    assertOutletAccess(request, existing.outletId, [...MUTATE_ROLES]);
    this.assertStockRange(dto.minStock ?? existing.minStock, dto.maxStock ?? existing.maxStock);
    if (dto.sku && dto.sku !== existing.sku) await this.assertSkuAvailable(dto.sku);
    if (dto.barcode && dto.barcode !== existing.barcode) await this.assertBarcodeAvailable(dto.barcode);

    return this.itemRepository.update(id, dto);
  }

  async softDelete(request: RequestWithAccess, id: string): Promise<Item> {
    const existing = await this.getOrThrow(id);
    assertOutletAccess(request, existing.outletId, [...MUTATE_ROLES]);
    await this.assertNoOpenPurchaseOrders(id);
    return this.itemRepository.update(id, { isActive: false });
  }

  /** Spec's business rule: block deactivation if an open (not Closed/
   * Cancelled/Rejected) PurchaseOrder references this item. */
  private async assertNoOpenPurchaseOrders(itemId: string): Promise<void> {
    const purchaseOrderRepository = this.moduleRef.get<PurchaseOrderRepository>(PURCHASE_ORDER_REPOSITORY, {
      strict: false,
    });
    if (await purchaseOrderRepository.hasOpenPurchaseOrderForItem(itemId)) {
      throw new ConflictException('Cannot deactivate item with open purchase orders');
    }
  }

  async list(request: RequestWithAccess, query: QueryItemsDto): Promise<Item[]> {
    return this.itemRepository.findScoped({
      accessibleOutletIds: request.effectiveAccess!.effectiveOutletIds,
      outletId: query.outletId,
      categoryId: query.categoryId,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
      search: query.search,
      belowMinStock: query.belowMinStock === 'true',
    });
  }

  private assertStockRange(minStock: string, maxStock: string): void {
    if (Number(minStock) >= Number(maxStock)) {
      throw new BadRequestException('minStock must be less than maxStock');
    }
  }

  private async assertSkuAvailable(sku: string): Promise<void> {
    const existing = await this.itemRepository.findBySku(sku);
    if (existing) throw new ConflictException('An item with this SKU already exists');
  }

  private async assertBarcodeAvailable(barcode: string): Promise<void> {
    const existing = await this.itemRepository.findByBarcode(barcode);
    if (existing) throw new ConflictException('An item with this barcode already exists');
  }

  private async getOrThrow(id: string): Promise<Item> {
    const item = await this.itemRepository.findById(id);
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }
}

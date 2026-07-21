import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ITEM_REPOSITORY } from '../repositories/tokens';
import { ItemRepository } from '../repositories/item.repository';
import { Item } from '../domain/item.entity';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { QueryItemsDto } from '../dto/query-items.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { assertOutletAccess } from '../access.util';

const MUTATE_ROLES = ['CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER'] as const;

@Injectable()
export class ItemsService {
  constructor(@Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository) {}

  async create(request: RequestWithAccess, dto: CreateItemDto): Promise<Item> {
    assertOutletAccess(request, dto.outletId, [...MUTATE_ROLES]);
    this.assertStockRange(dto.minStock, dto.maxStock);
    await this.assertSkuAvailable(dto.sku);
    if (dto.barcode) await this.assertBarcodeAvailable(dto.barcode);

    return this.itemRepository.create(dto);
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

  /**
   * Spec's business rule: block deactivation if an open (not Closed/
   * Cancelled/Rejected) PurchaseOrder references this item. PurchaseOrder
   * doesn't exist yet — FR-04 isn't built — so there's nothing to check
   * against yet. Known gap, not a silent omission; revisit when FR-04
   * lands.
   */
  async softDelete(request: RequestWithAccess, id: string): Promise<Item> {
    const existing = await this.getOrThrow(id);
    assertOutletAccess(request, existing.outletId, [...MUTATE_ROLES]);
    return this.itemRepository.update(id, { isActive: false });
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

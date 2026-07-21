import { Injectable } from '@nestjs/common';
import { Item as PrismaItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Item } from '../../domain/item.entity';
import { CreateItemInput, ItemFilters, ItemRepository, UpdateItemInput } from '../item.repository';

function toDomain(item: PrismaItem): Item {
  return {
    ...item,
    // .toFixed(n), not .toString() — Decimal.toString() drops trailing
    // zeros (85.50 -> "85.5"), which breaks the fixed-precision contract
    // CLAUDE.md sets for amounts (2dp)/quantities (3dp) app-wide, and
    // silently mismatches whatever's actually stored in the DECIMAL(_,n)
    // column.
    minStock: item.minStock.toFixed(3),
    maxStock: item.maxStock.toFixed(3),
    currentStock: item.currentStock.toFixed(3),
    costPrice: item.costPrice.toFixed(2),
  };
}

@Injectable()
export class PrismaItemRepository implements ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateItemInput): Promise<Item> {
    const item = await this.prisma.item.create({ data });
    return toDomain(item);
  }

  async findById(id: string): Promise<Item | null> {
    const item = await this.prisma.item.findUnique({ where: { id } });
    return item ? toDomain(item) : null;
  }

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const item = await this.prisma.item.update({ where: { id }, data });
    return toDomain(item);
  }

  async findBySku(sku: string): Promise<Item | null> {
    const item = await this.prisma.item.findUnique({ where: { sku } });
    return item ? toDomain(item) : null;
  }

  async findByBarcode(barcode: string): Promise<Item | null> {
    // findFirst, not findUnique — barcode is no longer a DB-level unique
    // column (see the schema note), so it's not a valid `where` shape for
    // findUnique anymore. Still only ever used for the application-level
    // duplicate check in ItemsService.
    const item = await this.prisma.item.findFirst({ where: { barcode } });
    return item ? toDomain(item) : null;
  }

  async findScoped(filters: ItemFilters): Promise<Item[]> {
    if (filters.accessibleOutletIds.length === 0) return [];
    if (filters.outletId && !filters.accessibleOutletIds.includes(filters.outletId)) return [];

    const where: Prisma.ItemWhereInput = {
      outletId: filters.outletId ?? { in: filters.accessibleOutletIds },
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { sku: { contains: filters.search } },
        ],
      }),
    };

    const items = await this.prisma.item.findMany({ where, orderBy: { name: 'asc' } });
    const domainItems = items.map(toDomain);

    // Cross-column comparison (currentStock < minStock) — not expressible
    // in a plain Prisma `where`, so applied after the main query.
    return filters.belowMinStock
      ? domainItems.filter((item) => Number(item.currentStock) < Number(item.minStock))
      : domainItems;
  }
}

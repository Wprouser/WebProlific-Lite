import { Item } from '../domain/item.entity';

export interface CreateItemInput {
  outletId: string;
  name: string;
  categoryId: string;
  sku: string;
  barcode?: string;
  unit: string;
  minStock: string;
  maxStock: string;
  shelfLifeDays?: number;
  costPrice: string;
  defaultSupplierId?: string;
  storageLocation?: string;
}

// currentStock and outletId are deliberately absent — currentStock is only
// ever mutated by FR-02's Stock Transaction service (spec's business-logic
// rule), and moving an item between outlets isn't a plain field edit (that
// would be a Transfer, FR-08's concern), not something PATCH /items/:id
// should silently allow.
export interface UpdateItemInput {
  name?: string;
  categoryId?: string;
  sku?: string;
  barcode?: string | null;
  unit?: string;
  minStock?: string;
  maxStock?: string;
  shelfLifeDays?: number | null;
  costPrice?: string;
  defaultSupplierId?: string | null;
  storageLocation?: string | null;
  isActive?: boolean;
}

export interface ItemFilters {
  /** Every result row must have an outletId in this set — scoping, not an
   * explicit user-chosen filter. */
  accessibleOutletIds: string[];
  outletId?: string;
  categoryId?: string;
  isActive?: boolean;
  /** Case-insensitive substring match against name or sku. */
  search?: string;
  /** currentStock < minStock — a cross-column comparison Prisma's `where`
   * can't express directly, so the repository applies it after the main
   * query rather than in SQL. See PrismaItemRepository.findScoped. */
  belowMinStock?: boolean;
}

export interface ItemRepository {
  create(data: CreateItemInput): Promise<Item>;
  findById(id: string): Promise<Item | null>;
  update(id: string, data: UpdateItemInput): Promise<Item>;
  findBySku(sku: string): Promise<Item | null>;
  findByBarcode(barcode: string): Promise<Item | null>;
  findScoped(filters: ItemFilters): Promise<Item[]>;
}

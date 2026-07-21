// Application-layer stand-ins for FR-18's ActivityCategory/EntityCategory/
// Operation enums — Prisma's SQL Server connector rejects the `enum` schema
// construct outright (see prisma/schema.prisma header note), so these are
// the single source of truth for allowed values, same pattern as
// tenancy/constants/enums.ts.

export const ACTIVITY_CATEGORIES = [
  'AUTH',
  'USER_MGMT',
  'ITEM',
  'STOCK',
  'SUPPLIER',
  'PURCHASE_ORDER',
  'GRN',
  'TRANSFER',
  'RECIPE',
  'ALERT',
  'REPORT',
  'SETTINGS',
  'TAX_CURRENCY',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

// MASTER_DATA: Item, Category, Supplier, Recipe, TaxRate, Currency, User,
// Outlet/Property/Chain settings. TRANSACTIONAL: StockTransaction,
// PurchaseOrder, GRN, Transfer, Sale.
export const ENTITY_CATEGORIES = ['MASTER_DATA', 'TRANSACTIONAL'] as const;
export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];

export const OPERATIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export type Operation = (typeof OPERATIONS)[number];

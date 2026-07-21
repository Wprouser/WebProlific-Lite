// Seeded onto every newly created outlet (see DefaultCategoriesListener) so
// a brand-new customer can add their first item without first having to
// invent a category taxonomy from scratch. Deliberately generic — outlets
// can rename/add their own afterward; this is just a sane starting point.
export const DEFAULT_CATEGORY_NAMES = [
  'Vegetables',
  'Dairy',
  'Dry Goods',
  'Beverages',
  'Meat & Poultry',
  'Cleaning Supplies',
] as const;

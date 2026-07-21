import { apiClient } from './api-client';

export type Unit = 'KG' | 'LITRE' | 'PIECE' | 'BOX' | 'GRAM' | 'ML';

export interface ApiCategory {
  id: string;
  name: string;
  outletId: string;
}

export interface ApiItem {
  id: string;
  outletId: string;
  name: string;
  categoryId: string;
  sku: string;
  barcode: string | null;
  unit: Unit;
  minStock: string;
  maxStock: string;
  currentStock: string;
  shelfLifeDays: number | null;
  // Omitted entirely (not just empty) in the response body for CHEF users —
  // see FieldRestrictionInterceptor. Never assume it's present.
  costPrice?: string;
  defaultSupplierId: string | null;
  storageLocation: string | null;
  isActive: boolean;
}

export interface ItemFilters {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  belowMinStock?: boolean;
}

export interface CreateItemInput {
  outletId: string;
  name: string;
  categoryId: string;
  sku: string;
  barcode: string | null;
  unit: Unit;
  minStock: string;
  maxStock: string;
  costPrice: string;
  storageLocation: string | null;
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, 'outletId'>>;

function buildQuery(filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.search) params.set('search', filters.search);
  if (filters.belowMinStock) params.set('belowMinStock', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const itemsApi = {
  list: (filters: ItemFilters) => apiClient.get<ApiItem[]>(`/items${buildQuery(filters)}`),
  create: (input: CreateItemInput) => apiClient.post<ApiItem>('/items', input),
  update: (id: string, input: UpdateItemInput) => apiClient.patch<ApiItem>(`/items/${id}`, input),
  deactivate: (id: string) => apiClient.delete<ApiItem>(`/items/${id}`),
};

export const categoriesApi = {
  list: () => apiClient.get<ApiCategory[]>('/items/categories'),
  create: (name: string, outletId: string) => apiClient.post<ApiCategory>('/items/categories', { name, outletId }),
};

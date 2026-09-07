import { Category } from '../domain/category.entity';

export interface CreateCategoryInput {
  name: string;
  outletId: string;
}

export interface UpdateCategoryInput {
  name?: string;
  isActive?: boolean;
}

export interface CategoryFilters {
  accessibleOutletIds: string[];
  outletId?: string;
  // Omitted entirely = both active and inactive rows, same convention as
  // UnitOfMeasureFilters — the Category Management screen needs to show
  // deactivated categories too, not just what's currently selectable on
  // the Item form.
  isActive?: boolean;
}

export interface CategoryRepository {
  create(data: CreateCategoryInput): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findByNameAndOutlet(name: string, outletId: string): Promise<Category | null>;
  update(id: string, data: UpdateCategoryInput): Promise<Category>;
  findScoped(filters: CategoryFilters): Promise<Category[]>;
}

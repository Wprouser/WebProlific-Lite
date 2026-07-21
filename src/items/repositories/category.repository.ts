import { Category } from '../domain/category.entity';

export interface CreateCategoryInput {
  name: string;
  outletId: string;
}

export interface CategoryFilters {
  accessibleOutletIds: string[];
  outletId?: string;
}

export interface CategoryRepository {
  create(data: CreateCategoryInput): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findByNameAndOutlet(name: string, outletId: string): Promise<Category | null>;
  findScoped(filters: CategoryFilters): Promise<Category[]>;
}

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../repositories/tokens';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../domain/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { QueryCategoriesDto } from '../dto/query-categories.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { assertOutletAccess } from '../../tenancy/access.util';

const MUTATE_ROLES = ['CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER'] as const;

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(request: RequestWithAccess, dto: CreateCategoryDto): Promise<Category> {
    assertOutletAccess(request, dto.outletId, [...MUTATE_ROLES]);

    const existing = await this.categoryRepository.findByNameAndOutlet(dto.name, dto.outletId);
    if (existing) throw new ConflictException('A category with this name already exists for this outlet');

    return this.categoryRepository.create(dto);
  }

  async findById(request: RequestWithAccess, id: string): Promise<Category> {
    const category = await this.getOrThrow(id);
    assertOutletAccess(request, category.outletId);
    return category;
  }

  async update(request: RequestWithAccess, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.getOrThrow(id);
    assertOutletAccess(request, existing.outletId, [...MUTATE_ROLES]);

    return this.categoryRepository.update(id, dto);
  }

  /**
   * Spec: soft-deactivate only, same as Unit of Measure/Item/TaxRate — a
   * category may already be referenced by historical Items and must remain
   * meaningful in that historical context. Deactivating never affects any
   * Item already using it — it only stops appearing as an option for
   * new/edited items.
   */
  async deactivate(request: RequestWithAccess, id: string): Promise<Category> {
    const existing = await this.getOrThrow(id);
    assertOutletAccess(request, existing.outletId, [...MUTATE_ROLES]);

    return this.categoryRepository.update(id, { isActive: false });
  }

  async list(request: RequestWithAccess, query: QueryCategoriesDto): Promise<Category[]> {
    return this.categoryRepository.findScoped({
      accessibleOutletIds: request.effectiveAccess!.effectiveOutletIds,
      outletId: query.outletId,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });
  }

  private async getOrThrow(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }
}

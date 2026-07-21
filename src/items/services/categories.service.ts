import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../repositories/tokens';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../domain/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
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

  async list(request: RequestWithAccess, query: QueryCategoriesDto): Promise<Category[]> {
    return this.categoryRepository.findScoped({
      accessibleOutletIds: request.effectiveAccess!.effectiveOutletIds,
      outletId: query.outletId,
    });
  }
}

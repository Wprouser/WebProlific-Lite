import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Category } from '../../domain/category.entity';
import { CategoryFilters, CategoryRepository, CreateCategoryInput } from '../category.repository';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async findByNameAndOutlet(name: string, outletId: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { name_outletId: { name, outletId } } });
  }

  async findScoped(filters: CategoryFilters): Promise<Category[]> {
    if (filters.accessibleOutletIds.length === 0) return [];
    if (filters.outletId && !filters.accessibleOutletIds.includes(filters.outletId)) return [];

    return this.prisma.category.findMany({
      where: { outletId: filters.outletId ?? { in: filters.accessibleOutletIds } },
      orderBy: { name: 'asc' },
    });
  }
}

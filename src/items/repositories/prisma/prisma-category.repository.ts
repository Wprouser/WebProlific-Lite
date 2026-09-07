import { Injectable } from '@nestjs/common';
import { Category as PrismaCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Category } from '../../domain/category.entity';
import {
  CategoryFilters,
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../category.repository';

function toDomain(row: PrismaCategory): Category {
  return {
    id: row.id,
    name: row.name,
    outletId: row.outletId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryInput): Promise<Category> {
    const row = await this.prisma.category.create({ data });
    return toDomain(row);
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByNameAndOutlet(name: string, outletId: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { name_outletId: { name, outletId } } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const row = await this.prisma.category.update({ where: { id }, data });
    return toDomain(row);
  }

  async findScoped(filters: CategoryFilters): Promise<Category[]> {
    if (filters.accessibleOutletIds.length === 0) return [];
    if (filters.outletId && !filters.accessibleOutletIds.includes(filters.outletId)) return [];

    const where: Prisma.CategoryWhereInput = {
      outletId: filters.outletId ?? { in: filters.accessibleOutletIds },
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };

    const rows = await this.prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    return rows.map(toDomain);
  }
}

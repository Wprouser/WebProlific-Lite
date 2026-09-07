import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { QueryCategoriesDto } from '../dto/query-categories.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { AuditLogService } from '../../rbac/services/audit-log.service';

/**
 * Registered ahead of ItemsController in ItemsModule so `GET/POST/PATCH/
 * DELETE items/categories` resolve before ItemsController's `GET
 * items/:id` would otherwise treat "categories" as an item id.
 */
@Controller('items/categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto, @Req() request: RequestWithAccess) {
    const category = await this.categoriesService.create(request, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_CATEGORY',
      entityType: 'Category',
      entityId: category.id,
      outletId: category.outletId,
      after: category,
    });
    return category;
  }

  @Get()
  list(@Req() request: RequestWithAccess, @Query() query: QueryCategoriesDto) {
    return this.categoriesService.list(request, query);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() request: RequestWithAccess) {
    const before = await this.categoriesService.findById(request, id);
    const after = await this.categoriesService.update(request, id, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'UPDATE_CATEGORY',
      entityType: 'Category',
      entityId: id,
      outletId: after.outletId,
      before,
      after,
    });
    return after;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @Req() request: RequestWithAccess) {
    const before = await this.categoriesService.findById(request, id);
    const after = await this.categoriesService.deactivate(request, id);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'DEACTIVATE_CATEGORY',
      entityType: 'Category',
      entityId: id,
      outletId: after.outletId,
      before,
      after,
    });
    return after;
  }
}

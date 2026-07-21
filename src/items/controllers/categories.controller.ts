import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { QueryCategoriesDto } from '../dto/query-categories.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { AuditLogService } from '../../rbac/services/audit-log.service';

/**
 * Registered ahead of ItemsController in ItemsModule so `GET/POST
 * items/categories` resolve before ItemsController's `GET items/:id` would
 * otherwise treat "categories" as an item id.
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
}

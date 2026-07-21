import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { CategoriesController } from './controllers/categories.controller';
import { ItemsController } from './controllers/items.controller';
import { CategoriesService } from './services/categories.service';
import { ItemsService } from './services/items.service';
import { DefaultCategoriesListener } from './listeners/default-categories.listener';
import { ITEM_REPOSITORY, CATEGORY_REPOSITORY } from './repositories/tokens';
import { PrismaItemRepository } from './repositories/prisma/prisma-item.repository';
import { PrismaCategoryRepository } from './repositories/prisma/prisma-category.repository';

@Module({
  imports: [RbacModule],
  // CategoriesController registered before ItemsController — see that
  // controller's doc comment (GET/POST items/categories must resolve
  // before ItemsController's GET items/:id).
  controllers: [CategoriesController, ItemsController],
  providers: [
    ItemsService,
    CategoriesService,
    DefaultCategoriesListener,
    { provide: ITEM_REPOSITORY, useClass: PrismaItemRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  // ITEM_REPOSITORY: FR-02's StockTransactionsService needs an item's
  // outletId/currentStock — reuses this rather than a second repository.
  exports: [ITEM_REPOSITORY],
})
export class ItemsModule {}

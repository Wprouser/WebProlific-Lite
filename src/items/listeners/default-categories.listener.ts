import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OUTLET_CREATED_EVENT, OutletCreatedEvent } from '../../tenancy/events/outlet-created.event';
import { CategoryRepository } from '../repositories/category.repository';
import { CATEGORY_REPOSITORY } from '../repositories/tokens';
import { DEFAULT_CATEGORY_NAMES } from '../constants/default-categories';

/**
 * Every newly created outlet gets a starter set of categories (see
 * default-categories.ts) so a new customer can add their first item
 * without first inventing a category taxonomy. Not a user action — no
 * ActivityLog entry, same as other system-initiated setup.
 */
@Injectable()
export class DefaultCategoriesListener {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository) {}

  @OnEvent(OUTLET_CREATED_EVENT)
  async handle(event: OutletCreatedEvent): Promise<void> {
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await this.categoryRepository.create({ name, outletId: event.outletId });
    }
  }
}

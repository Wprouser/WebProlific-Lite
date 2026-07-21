import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../domain/category.entity';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

function fixtureRequest(role: string | undefined = 'OUTLET_MANAGER'): RequestWithAccess {
  return {
    user: { id: 'u1' },
    effectiveAccess: {
      userId: 'u1',
      effectiveOutletIds: ['o1'],
      effectivePropertyIds: [],
      effectiveChainIds: [],
      effectiveRole: role as never,
      grants: [],
      roleForChain: () => undefined,
      roleForProperty: () => undefined,
      roleForOutlet: () => role as never,
    },
  } as unknown as RequestWithAccess;
}

describe('CategoriesService', () => {
  function buildService(existing: Category | null = null) {
    const categoryRepository: Partial<CategoryRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'c1', name: 'Dry Goods', outletId: 'o1' }),
      findByNameAndOutlet: jest.fn().mockResolvedValue(existing),
      findScoped: jest.fn().mockResolvedValue([]),
    };
    const service = new CategoriesService(categoryRepository as CategoryRepository);
    return { service, categoryRepository };
  }

  it('creates a category for an authorized role', async () => {
    const { service, categoryRepository } = buildService();
    await service.create(fixtureRequest(), { name: 'Dry Goods', outletId: 'o1' });
    expect(categoryRepository.create).toHaveBeenCalledWith({ name: 'Dry Goods', outletId: 'o1' });
  });

  it('rejects a duplicate category name within the same outlet', async () => {
    const { service } = buildService({ id: 'existing', name: 'Dry Goods', outletId: 'o1' });
    await expect(
      service.create(fixtureRequest(), { name: 'Dry Goods', outletId: 'o1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a role not permitted to mutate (STORE_STAFF)', async () => {
    const { service } = buildService();
    await expect(
      service.create(fixtureRequest('STORE_STAFF'), { name: 'Dry Goods', outletId: 'o1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('list scopes by the caller\'s effectiveOutletIds', async () => {
    const { service, categoryRepository } = buildService();
    await service.list(fixtureRequest(), {});
    expect(categoryRepository.findScoped).toHaveBeenCalledWith(
      expect.objectContaining({ accessibleOutletIds: ['o1'] }),
    );
  });
});

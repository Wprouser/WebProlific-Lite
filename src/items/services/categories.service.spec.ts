import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../domain/category.entity';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

function fixtureRequest(role: string | null = 'OUTLET_MANAGER'): RequestWithAccess {
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

function fixtureCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Dry Goods',
    outletId: 'o1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CategoriesService', () => {
  function buildService(existing: Category = fixtureCategory(), byId: Record<string, Category | null> = {}) {
    const categoryRepository: Partial<CategoryRepository> = {
      create: jest.fn().mockResolvedValue(existing),
      findById: jest.fn().mockImplementation((id: string) => Promise.resolve(id in byId ? byId[id] : existing)),
      findByNameAndOutlet: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ ...existing, isActive: false }),
      findScoped: jest.fn().mockResolvedValue([existing]),
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
    const { service, categoryRepository } = buildService();
    (categoryRepository.findByNameAndOutlet as jest.Mock).mockResolvedValue(fixtureCategory({ id: 'existing' }));
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

  it('update edits name', async () => {
    const { service, categoryRepository } = buildService();
    await service.update(fixtureRequest(), 'c1', { name: 'Dry Goods & Grains' });
    expect(categoryRepository.update).toHaveBeenCalledWith('c1', { name: 'Dry Goods & Grains' });
  });

  it('update throws NotFoundException for a missing category', async () => {
    const { service, categoryRepository } = buildService();
    (categoryRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(service.update(fixtureRequest(), 'missing', { name: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('rejects an update from a role not permitted to mutate (STORE_STAFF)', async () => {
    const { service } = buildService();
    await expect(
      service.update(fixtureRequest('STORE_STAFF'), 'c1', { name: 'x' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('AC: deactivate soft-deactivates only (isActive: false), never removes the row', async () => {
    const { service, categoryRepository } = buildService();
    const result = await service.deactivate(fixtureRequest(), 'c1');
    expect(categoryRepository.update).toHaveBeenCalledWith('c1', { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('list scopes by the caller\'s effectiveOutletIds', async () => {
    const { service, categoryRepository } = buildService();
    await service.list(fixtureRequest(), {});
    expect(categoryRepository.findScoped).toHaveBeenCalledWith(
      expect.objectContaining({ accessibleOutletIds: ['o1'] }),
    );
  });

  it('list passes through the outletId and isActive filters', async () => {
    const { service, categoryRepository } = buildService();
    await service.list(fixtureRequest(), { outletId: 'o1', isActive: 'true' });
    expect(categoryRepository.findScoped).toHaveBeenCalledWith({
      accessibleOutletIds: ['o1'],
      outletId: 'o1',
      isActive: true,
    });
  });
});

import { PrismaCategoryRepository } from './prisma-category.repository';

function fixtureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Dry Goods',
    outletId: 'o1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('PrismaCategoryRepository', () => {
  function buildRepository() {
    const create = jest.fn();
    const findUnique = jest.fn();
    const update = jest.fn();
    const findMany = jest.fn();
    const prisma = { category: { create, findUnique, update, findMany } };
    const repository = new PrismaCategoryRepository(prisma as any);
    return { repository, create, findUnique, update, findMany };
  }

  it('creates a category scoped to the given outlet', async () => {
    const { repository, create } = buildRepository();
    create.mockResolvedValue(fixtureRow());
    await repository.create({ outletId: 'o1', name: 'Dry Goods' });
    expect(create).toHaveBeenCalledWith({ data: { outletId: 'o1', name: 'Dry Goods' } });
  });

  it('findById returns null for a missing row', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(null);
    expect(await repository.findById('missing')).toBeNull();
  });

  it('findByNameAndOutlet looks up via the compound unique key', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(fixtureRow());
    await repository.findByNameAndOutlet('Dry Goods', 'o1');
    expect(findUnique).toHaveBeenCalledWith({ where: { name_outletId: { name: 'Dry Goods', outletId: 'o1' } } });
  });

  it('AC: update can deactivate (isActive: false) without deleting the row', async () => {
    const { repository, update } = buildRepository();
    update.mockResolvedValue(fixtureRow({ isActive: false }));
    const result = await repository.update('c1', { isActive: false });
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { isActive: false } });
    expect(result.isActive).toBe(false);
  });

  it('update edits the name', async () => {
    const { repository, update } = buildRepository();
    update.mockResolvedValue(fixtureRow({ name: 'Dry Goods & Grains' }));
    const result = await repository.update('c1', { name: 'Dry Goods & Grains' });
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { name: 'Dry Goods & Grains' } });
    expect(result.name).toBe('Dry Goods & Grains');
  });

  it('findScoped filters by outlet and isActive, ordered by name', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([fixtureRow()]);
    await repository.findScoped({ accessibleOutletIds: ['o1', 'o2'], outletId: 'o1', isActive: true });
    expect(findMany).toHaveBeenCalledWith({
      where: { outletId: 'o1', isActive: true },
      orderBy: { name: 'asc' },
    });
  });

  it('findScoped returns [] when the caller has no accessible outlets', async () => {
    const { repository, findMany } = buildRepository();
    const result = await repository.findScoped({ accessibleOutletIds: [] });
    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

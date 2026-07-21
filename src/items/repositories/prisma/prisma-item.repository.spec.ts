import { PrismaItemRepository } from './prisma-item.repository';

function fixturePrismaItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    outletId: 'o1',
    name: 'Basmati Rice',
    categoryId: 'c1',
    sku: 'RICE-BAS-001',
    barcode: null,
    unit: 'KG',
    minStock: { toFixed: () => '10' },
    maxStock: { toFixed: () => '100' },
    currentStock: { toFixed: () => '0' },
    shelfLifeDays: 365,
    costPrice: { toFixed: () => '85.50' },
    defaultSupplierId: null,
    storageLocation: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PrismaItemRepository', () => {
  function buildRepository(items: ReturnType<typeof fixturePrismaItem>[] = []) {
    const findMany = jest.fn().mockResolvedValue(items);
    const prisma = { item: { findMany, create: jest.fn(), update: jest.fn() } };
    const repository = new PrismaItemRepository(prisma as any);
    return { repository, findMany };
  }

  it('returns no results (and does not query) when the caller has no accessible outlets', async () => {
    const { repository, findMany } = buildRepository();
    const result = await repository.findScoped({ accessibleOutletIds: [] });
    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('scopes to the accessible outlet set, narrowed by an explicit outletId filter', async () => {
    const { repository, findMany } = buildRepository();
    await repository.findScoped({ accessibleOutletIds: ['o1', 'o2'], outletId: 'o1' });
    expect(findMany.mock.calls[0][0].where.outletId).toBe('o1');
  });

  it('search matches against both name and sku', async () => {
    const { repository, findMany } = buildRepository();
    await repository.findScoped({ accessibleOutletIds: ['o1'], search: 'rice' });
    expect(findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: 'rice' } },
      { sku: { contains: 'rice' } },
    ]);
  });

  it('AC: belowMinStock=true returns only items where currentStock < minStock', async () => {
    const { repository } = buildRepository([
      fixturePrismaItem({ id: 'below', currentStock: { toFixed: () => '5' }, minStock: { toFixed: () => '10' } }),
      fixturePrismaItem({ id: 'above', currentStock: { toFixed: () => '50' }, minStock: { toFixed: () => '10' } }),
      fixturePrismaItem({ id: 'equal', currentStock: { toFixed: () => '10' }, minStock: { toFixed: () => '10' } }),
    ]);

    const result = await repository.findScoped({ accessibleOutletIds: ['o1'], belowMinStock: true });

    expect(result.map((i) => i.id)).toEqual(['below']);
  });

  it('belowMinStock=false (default) returns every scoped item regardless of stock level', async () => {
    const { repository } = buildRepository([
      fixturePrismaItem({ id: 'below', currentStock: { toFixed: () => '5' }, minStock: { toFixed: () => '10' } }),
      fixturePrismaItem({ id: 'above', currentStock: { toFixed: () => '50' }, minStock: { toFixed: () => '10' } }),
    ]);

    const result = await repository.findScoped({ accessibleOutletIds: ['o1'] });

    expect(result.map((i) => i.id).sort()).toEqual(['above', 'below']);
  });

  it('Decimal fields are serialized to strings, not left as Prisma.Decimal objects', async () => {
    const { repository } = buildRepository([fixturePrismaItem()]);
    const [item] = await repository.findScoped({ accessibleOutletIds: ['o1'] });
    expect(item!.minStock).toBe('10');
    expect(item!.costPrice).toBe('85.50');
  });
});

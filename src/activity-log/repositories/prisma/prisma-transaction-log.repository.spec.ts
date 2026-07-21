import { PrismaTransactionLogRepository } from './prisma-transaction-log.repository';

describe('PrismaTransactionLogRepository', () => {
  function buildRepository() {
    const findMany = jest.fn().mockResolvedValue([]);
    const create = jest.fn().mockImplementation((args) =>
      Promise.resolve({
        id: 'tl1',
        outletId: null,
        chainId: null,
        propertyId: null,
        fieldName: null,
        oldValue: null,
        newValue: null,
        currencyCode: null,
        performedById: null,
        valueAmount: null,
        createdAt: new Date(),
        ...args.data,
      }),
    );
    const prisma = { transactionLog: { findMany, create } };
    const repository = new PrismaTransactionLogRepository(prisma as any);
    return { repository, findMany, create };
  }

  it('returns no results (and does not query) when the caller has no accessible outlet/property/chain at all', async () => {
    const { repository, findMany } = buildRepository();

    const result = await repository.findScoped({
      accessibleChainIds: [],
      accessiblePropertyIds: [],
      accessibleOutletIds: [],
    });

    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('scopes by the OR of accessible outlet/property/chain ids', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: ['C1'],
      accessiblePropertyIds: ['P1'],
      accessibleOutletIds: ['O1', 'O2'],
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { outletId: { in: ['O1', 'O2'] } },
      { outletId: null, propertyId: { in: ['P1'] } },
      { outletId: null, propertyId: null, chainId: { in: ['C1'] } },
    ]);
  });

  it('a chain-level row (an OUTLET_MANAGER should not see) is excluded when the caller only has outlet access', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: [],
      accessiblePropertyIds: [],
      accessibleOutletIds: ['O1'],
    });

    const where = findMany.mock.calls[0][0].where;
    // No chain-level clause at all when the caller has no chain grant —
    // the property/chain-level branches are only added when non-empty.
    expect(where.OR).toEqual([{ outletId: { in: ['O1'] } }]);
  });

  it('an explicit filter narrows within scope (AND), not folded into the OR scope clauses', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: ['C1'],
      accessiblePropertyIds: [],
      accessibleOutletIds: [],
      entityType: 'Chain',
      chainId: 'C1',
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.entityType).toBe('Chain');
    expect(where.chainId).toBe('C1');
    expect(where.OR).toContainEqual({ outletId: null, propertyId: null, chainId: { in: ['C1'] } });
  });
});

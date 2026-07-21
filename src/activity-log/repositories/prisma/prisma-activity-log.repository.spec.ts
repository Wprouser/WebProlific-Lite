import { PrismaActivityLogRepository } from './prisma-activity-log.repository';

describe('PrismaActivityLogRepository', () => {
  function buildRepository() {
    const findMany = jest.fn().mockResolvedValue([]);
    const create = jest.fn().mockImplementation((args) =>
      Promise.resolve({
        id: 'al1',
        chainId: null,
        propertyId: null,
        outletId: null,
        userId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        ipAddress: null,
        deviceInfo: null,
        createdAt: new Date(),
        ...args.data,
      }),
    );
    const prisma = { activityLog: { findMany, create } };
    const repository = new PrismaActivityLogRepository(prisma as any);
    return { repository, findMany, create };
  }

  it('JSON-stringifies metadata at the repository boundary (no native Json column on SQL Server)', async () => {
    const { repository, create } = buildRepository();
    await repository.create({
      category: 'SETTINGS',
      action: 'CREATE_CHAIN',
      description: 'activity.chain.create_chain',
      metadata: { after: { name: 'Al Waha Group' } },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ metadata: JSON.stringify({ after: { name: 'Al Waha Group' } }) }),
    });
  });

  it('scopes by the OR of accessible outlet/property/chain ids, never leaking a sibling property\'s rows', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: [],
      accessiblePropertyIds: ['P1'],
      accessibleOutletIds: [],
      requesterId: 'u1',
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { outletId: null, propertyId: { in: ['P1'] } },
      { chainId: null, propertyId: null, outletId: null, userId: 'u1' },
    ]);
  });

  it('an explicit filter narrows within scope (AND), rather than being folded into the OR scope clauses', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: ['C1'],
      accessiblePropertyIds: [],
      accessibleOutletIds: [],
      requesterId: 'u1',
      category: 'AUTH',
      outletId: 'O1',
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.category).toBe('AUTH');
    expect(where.outletId).toBe('O1');
    // The scope constraint is still present as a sibling OR — Prisma ANDs
    // top-level keys together, so a row must satisfy both.
    expect(where.OR).toContainEqual({ outletId: null, propertyId: null, chainId: { in: ['C1'] } });
  });

  it('unscoped rows (login/logout — no chain/property/outlet at all) are only matched for the requester\'s own userId', async () => {
    const { repository, findMany } = buildRepository();

    await repository.findScoped({
      accessibleChainIds: [],
      accessiblePropertyIds: [],
      accessibleOutletIds: [],
      requesterId: 'u1',
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ chainId: null, propertyId: null, outletId: null, userId: 'u1' }]);
  });
});

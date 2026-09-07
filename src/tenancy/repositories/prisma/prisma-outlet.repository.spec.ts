import { PrismaOutletRepository } from './prisma-outlet.repository';

function fixturePrismaOutlet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    propertyId: 'p1',
    chainId: 'c1',
    name: 'Main Restaurant',
    type: 'RESTAURANT',
    baseCurrency: 'SAR',
    poApprovalThreshold: null,
    isActive: true,
    property: { name: 'Jeddah Hotel', chain: { name: 'Al Waha Hospitality Group' } },
    ...overrides,
  };
}

describe('PrismaOutletRepository', () => {
  describe('findByIdsWithHierarchyNames', () => {
    function buildRepository(outlets: ReturnType<typeof fixturePrismaOutlet>[] = []) {
      const findMany = jest.fn().mockResolvedValue(outlets);
      const prisma = { outlet: { findMany } };
      const repository = new PrismaOutletRepository(prisma as any);
      return { repository, findMany };
    }

    it('returns no results (and does not query) for an empty id set', async () => {
      const { repository, findMany } = buildRepository();
      expect(await repository.findByIdsWithHierarchyNames([])).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('AC: flattens the nested property/chain name onto each outlet', async () => {
      const { repository } = buildRepository([fixturePrismaOutlet()]);
      const [result] = await repository.findByIdsWithHierarchyNames(['o1']);
      expect(result).toEqual({
        id: 'o1',
        propertyId: 'p1',
        chainId: 'c1',
        name: 'Main Restaurant',
        type: 'RESTAURANT',
        baseCurrency: 'SAR',
        poApprovalThreshold: null,
        isActive: true,
        propertyName: 'Jeddah Hotel',
        chainName: 'Al Waha Hospitality Group',
      });
    });

    it('requests the join via a nested include, scoped to the given ids', async () => {
      const { repository, findMany } = buildRepository();
      await repository.findByIdsWithHierarchyNames(['o1', 'o2']);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['o1', 'o2'] } },
          include: { property: { select: { name: true, chain: { select: { name: true } } } } },
        }),
      );
    });
  });
});

import { PrismaTransferRepository } from './prisma-transfer.repository';

describe('PrismaTransferRepository', () => {
  describe('findScoped', () => {
    function buildRepository() {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { stockTransfer: { findMany } };
      const repository = new PrismaTransferRepository(prisma as any);
      return { repository, findMany };
    }

    it('returns no results (and does not query) when the caller has no accessible outlets', async () => {
      const { repository, findMany } = buildRepository();
      const result = await repository.findScoped({ accessibleOutletIds: [] });
      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('rejects an explicit outletId filter outside the accessible set, without querying', async () => {
      const { repository, findMany } = buildRepository();
      const result = await repository.findScoped({ accessibleOutletIds: ['o1'], outletId: 'o2' });
      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('queries by either side of the transfer, not just sourceOutletId', async () => {
      const { repository, findMany } = buildRepository();
      await repository.findScoped({ accessibleOutletIds: ['o1', 'o2'] });

      const where = findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({
        OR: [{ sourceOutletId: { in: ['o1', 'o2'] } }, { destOutletId: { in: ['o1', 'o2'] } }],
      });
    });

    it('narrows to a specific outlet on either side when one is requested', async () => {
      const { repository, findMany } = buildRepository();
      await repository.findScoped({ accessibleOutletIds: ['o1', 'o2'], outletId: 'o1' });

      const where = findMany.mock.calls[0][0].where;
      expect(where.AND[1]).toEqual({ OR: [{ sourceOutletId: 'o1' }, { destOutletId: 'o1' }] });
    });
  });
});

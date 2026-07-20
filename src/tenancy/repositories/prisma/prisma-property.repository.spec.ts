import { PrismaPropertyRepository } from './prisma-property.repository';

describe('PrismaPropertyRepository.deactivateCascade', () => {
  it('soft-deactivates the property and all its outlets, and never deletes anything', async () => {
    const calls: string[] = [];
    const tx = {
      property: {
        update: jest.fn((args) => {
          calls.push('property.update');
          return Promise.resolve({ id: args.where.id, isActive: false });
        }),
        delete: jest.fn(() => {
          calls.push('property.delete');
          return Promise.reject(new Error('should never be called'));
        }),
      },
      outlet: {
        updateMany: jest.fn((args) => {
          calls.push('outlet.updateMany');
          expect(args.where).toEqual({ propertyId: 'P1' });
          expect(args.data).toEqual({ isActive: false });
          return Promise.resolve({ count: 2 });
        }),
        deleteMany: jest.fn(() => {
          calls.push('outlet.deleteMany');
          return Promise.reject(new Error('should never be called'));
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };

    const repository = new PrismaPropertyRepository(prisma as any);
    await repository.deactivateCascade('P1');

    expect(calls).toEqual(['property.update', 'outlet.updateMany']);
    expect(tx.property.delete).not.toHaveBeenCalled();
    expect(tx.outlet.deleteMany).not.toHaveBeenCalled();
  });
});

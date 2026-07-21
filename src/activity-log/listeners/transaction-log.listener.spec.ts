import { TransactionLogListener } from './transaction-log.listener';
import { TransactionLogRepository } from '../repositories/transaction-log.repository';
import { EntityChangedEvent } from '../events/entity-changed.event';

describe('TransactionLogListener', () => {
  function buildListener() {
    const transactionLogRepository: Partial<TransactionLogRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'tl1' }),
    };
    const listener = new TransactionLogListener(transactionLogRepository as TransactionLogRepository);
    return { listener, transactionLogRepository };
  }

  it('AC: an UPDATE with two changed fields produces exactly two TransactionLog rows, one per field', async () => {
    const { listener, transactionLogRepository } = buildListener();
    const event: EntityChangedEvent = {
      outletId: 'o1',
      entityCategory: 'MASTER_DATA',
      entityType: 'Item',
      entityId: 'i1',
      operation: 'UPDATE',
      performedById: 'u1',
      entries: [
        { fieldName: 'name', oldValue: 'Rice', newValue: 'Basmati Rice' },
        { fieldName: 'minStock', oldValue: '10', newValue: '15' },
      ],
    };

    await listener.handle(event);

    expect(transactionLogRepository.create).toHaveBeenCalledTimes(2);
    expect(transactionLogRepository.create).toHaveBeenNthCalledWith(1, {
      outletId: 'o1',
      entityCategory: 'MASTER_DATA',
      entityType: 'Item',
      entityId: 'i1',
      operation: 'UPDATE',
      fieldName: 'name',
      oldValue: 'Rice',
      newValue: 'Basmati Rice',
      valueAmount: undefined,
      currencyCode: undefined,
      performedById: 'u1',
      summary: 'activity.transactionLog.fieldChanged',
    });
    expect(transactionLogRepository.create).toHaveBeenNthCalledWith(2, {
      outletId: 'o1',
      entityCategory: 'MASTER_DATA',
      entityType: 'Item',
      entityId: 'i1',
      operation: 'UPDATE',
      fieldName: 'minStock',
      oldValue: '10',
      newValue: '15',
      valueAmount: undefined,
      currencyCode: undefined,
      performedById: 'u1',
      summary: 'activity.transactionLog.fieldChanged',
    });
  });

  it('a value-bearing entry (e.g. a GRN receipt) is still just a TransactionLog row — valueAmount is enrichment, not a special case', async () => {
    const { listener, transactionLogRepository } = buildListener();
    const event: EntityChangedEvent = {
      outletId: 'o1',
      entityCategory: 'TRANSACTIONAL',
      entityType: 'GRN',
      entityId: 'g1',
      operation: 'CREATE',
      entries: [{ valueAmount: 1566, currencyCode: 'SAR' }],
    };

    await listener.handle(event);

    expect(transactionLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        valueAmount: 1566,
        currencyCode: 'SAR',
        summary: 'activity.transactionLog.created',
      }),
    );
  });

  it('CREATE/DELETE produce exactly one row (fieldName undefined)', async () => {
    const { listener, transactionLogRepository } = buildListener();
    const created: EntityChangedEvent = {
      outletId: 'o1',
      entityCategory: 'MASTER_DATA',
      entityType: 'Outlet',
      entityId: 'o1',
      operation: 'CREATE',
      entries: [{ newValue: JSON.stringify({ name: 'Main Restaurant' }) }],
    };
    await listener.handle(created);

    expect(transactionLogRepository.create).toHaveBeenCalledTimes(1);
    expect(transactionLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'CREATE', fieldName: undefined, summary: 'activity.transactionLog.created' }),
    );
  });
});

import { ActivityLogService } from './activity-log.service';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { TransactionLogRepository } from '../repositories/transaction-log.repository';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { EffectiveAccess } from '../../tenancy/services/scope-resolution.service';

function fixtureRequest(overrides: Partial<EffectiveAccess> = {}): RequestWithAccess {
  const access: EffectiveAccess = {
    userId: 'u1',
    effectiveOutletIds: [],
    effectivePropertyIds: [],
    effectiveChainIds: [],
    effectiveRole: 'PROPERTY_MANAGER',
    grants: [],
    roleForChain: () => undefined,
    roleForProperty: () => undefined,
    roleForOutlet: () => undefined,
    ...overrides,
  };
  return { user: { id: 'u1' }, effectiveAccess: access } as RequestWithAccess;
}

describe('ActivityLogService', () => {
  function buildService() {
    const activityLogRepository: Partial<ActivityLogRepository> = {
      findScoped: jest.fn().mockResolvedValue([]),
    };
    const transactionLogRepository: Partial<TransactionLogRepository> = {
      findScoped: jest.fn().mockResolvedValue([]),
    };
    const service = new ActivityLogService(
      activityLogRepository as ActivityLogRepository,
      transactionLogRepository as TransactionLogRepository,
    );
    return { service, activityLogRepository, transactionLogRepository };
  }

  it('findActivityLog resolves scoping from request.effectiveAccess, not just the query DTO', async () => {
    const { service, activityLogRepository } = buildService();
    const request = fixtureRequest({
      effectiveOutletIds: ['O1'],
      effectivePropertyIds: ['P1'],
      effectiveChainIds: ['C1'],
    });

    await service.findActivityLog(request, { category: 'AUTH' });

    expect(activityLogRepository.findScoped).toHaveBeenCalledWith({
      accessibleChainIds: ['C1'],
      accessiblePropertyIds: ['P1'],
      accessibleOutletIds: ['O1'],
      requesterId: 'u1',
      outletId: undefined,
      propertyId: undefined,
      chainId: undefined,
      category: 'AUTH',
      userId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('findTransactionLog scopes by effectiveOutletIds only — TransactionLog is always outlet-scoped', async () => {
    const { service, transactionLogRepository } = buildService();
    const request = fixtureRequest({ effectiveOutletIds: ['O1', 'O2'] });

    await service.findTransactionLog(request, { entityType: 'Item' });

    expect(transactionLogRepository.findScoped).toHaveBeenCalledWith(
      expect.objectContaining({ accessibleOutletIds: ['O1', 'O2'], entityType: 'Item' }),
    );
  });

  it('exportActivityLog produces a non-empty xlsx buffer with the correct content type', async () => {
    const { service, activityLogRepository } = buildService();
    (activityLogRepository.findScoped as jest.Mock).mockResolvedValue([
      {
        id: 'al1',
        chainId: 'c1',
        propertyId: null,
        outletId: null,
        userId: 'u1',
        category: 'SETTINGS',
        action: 'CREATE_CHAIN',
        entityType: 'Chain',
        entityId: 'c1',
        description: 'activity.chain.create_chain',
        metadata: null,
        ipAddress: null,
        deviceInfo: null,
        createdAt: new Date('2026-01-01'),
      },
    ]);
    const request = fixtureRequest({ effectiveChainIds: ['c1'] });

    const result = await service.exportActivityLog(request, { format: 'xlsx' });

    expect(result.contentType).toContain('spreadsheetml');
    expect(result.filename).toMatch(/\.xlsx$/);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('exportActivityLog produces a non-empty pdf buffer for format=pdf', async () => {
    const { service } = buildService();
    const request = fixtureRequest();

    const result = await service.exportActivityLog(request, { format: 'pdf' });

    expect(result.contentType).toBe('application/pdf');
    expect(result.filename).toMatch(/\.pdf$/);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});

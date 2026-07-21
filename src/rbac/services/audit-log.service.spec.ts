import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { ActivityBus } from '../../activity-log/services/activity-bus.service';

describe('AuditLogService', () => {
  function buildService() {
    const auditLogRepository: Partial<AuditLogRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'audit1' }),
    };
    const activityBus: Partial<ActivityBus> = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AuditLogService(
      auditLogRepository as AuditLogRepository,
      activityBus as ActivityBus,
    );
    return { service, auditLogRepository, activityBus };
  }

  it('writes the AuditLog row and emits exactly one activity.recorded event per call — FR-18 layers on, does not replace, FR-11', async () => {
    const { service, auditLogRepository, activityBus } = buildService();

    await service.record({
      userId: 'u1',
      action: 'CREATE_CHAIN',
      entityType: 'Chain',
      entityId: 'c1',
      after: { name: 'Al Waha Group' },
    });

    expect(auditLogRepository.create).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledTimes(1);
  });

  it('maps Chain/Property/Outlet entity types to the SETTINGS category and derives chain/property scope from entityId', async () => {
    const { service, activityBus } = buildService();

    await service.record({ userId: 'u1', action: 'CREATE_CHAIN', entityType: 'Chain', entityId: 'c1' });
    expect(activityBus.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'SETTINGS', chainId: 'c1', propertyId: undefined }),
    );

    await service.record({ userId: 'u1', action: 'CREATE_PROPERTY', entityType: 'Property', entityId: 'p1' });
    expect(activityBus.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'SETTINGS', propertyId: 'p1', chainId: undefined }),
    );

    await service.record({
      userId: 'u1',
      action: 'CREATE_OUTLET',
      entityType: 'Outlet',
      entityId: 'o1',
      outletId: 'o1',
    });
    expect(activityBus.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'SETTINGS', outletId: 'o1' }),
    );
  });

  it('maps User entity actions to the USER_MGMT category', async () => {
    const { service, activityBus } = buildService();

    await service.record({ userId: 'admin1', action: 'INVITE_USER', entityType: 'User', entityId: 'u2' });

    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'USER_MGMT', entityType: 'User', entityId: 'u2' }),
    );
  });

  it('maps SET_TWO_FACTOR_POLICY to AUTH even though it is recorded against a Chain entity', async () => {
    const { service, activityBus } = buildService();

    await service.record({
      userId: 'owner1',
      action: 'SET_TWO_FACTOR_POLICY',
      entityType: 'Chain',
      entityId: 'c1',
    });

    expect(activityBus.record).toHaveBeenCalledWith(expect.objectContaining({ category: 'AUTH' }));
  });

  it('stores a lowercased message-key style descriptionKey, not a frozen English sentence', async () => {
    const { service, activityBus } = buildService();

    await service.record({ userId: 'u1', action: 'CREATE_CHAIN', entityType: 'Chain', entityId: 'c1' });

    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ descriptionKey: 'activity.chain.create_chain' }),
    );
  });

  describe('FR-18 (revised): field-level entityChange for TransactionLog', () => {
    it('AC: an UPDATE with two changed fields produces one entry per field, unchanged fields omitted', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'u1',
        action: 'UPDATE_OUTLET',
        entityType: 'Outlet',
        entityId: 'o1',
        outletId: 'o1',
        before: { id: 'o1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: true },
        after: { id: 'o1', name: 'Main Restaurant (Renamed)', type: 'RESTAURANT', isActive: true },
      });

      expect(activityBus.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityChange: {
            outletId: 'o1',
            entityCategory: 'MASTER_DATA',
            entityType: 'Outlet',
            entityId: 'o1',
            operation: 'UPDATE',
            performedById: 'u1',
            entries: [{ fieldName: 'name', oldValue: 'Main Restaurant', newValue: 'Main Restaurant (Renamed)' }],
          },
        }),
      );
    });

    it('AC: CREATE produces exactly one entry with the whole record as newValue', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'u1',
        action: 'CREATE_OUTLET',
        entityType: 'Outlet',
        entityId: 'o1',
        outletId: 'o1',
        after: { id: 'o1', name: 'Main Restaurant' },
      });

      expect(activityBus.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityChange: expect.objectContaining({
            operation: 'CREATE',
            entries: [{ newValue: JSON.stringify({ id: 'o1', name: 'Main Restaurant' }) }],
          }),
        }),
      );
    });

    it('AC: an UPDATE where nothing actually changed produces no entityChange at all', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'u1',
        action: 'UPDATE_OUTLET',
        entityType: 'Outlet',
        entityId: 'o1',
        outletId: 'o1',
        before: { id: 'o1', name: 'Main Restaurant' },
        after: { id: 'o1', name: 'Main Restaurant' },
      });

      expect(activityBus.record).toHaveBeenCalledWith(expect.objectContaining({ entityChange: undefined }));
    });

    it('AC: a chain-level UPDATE produces an entityChange scoped by chainId (no outlet needed)', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'u1',
        action: 'UPDATE_CHAIN',
        entityType: 'Chain',
        entityId: 'c1',
        before: { id: 'c1', name: 'Al Waha Group' },
        after: { id: 'c1', name: 'Al Waha Hospitality Group' },
      });

      expect(activityBus.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityChange: expect.objectContaining({
            chainId: 'c1',
            propertyId: undefined,
            outletId: undefined,
            entries: [{ fieldName: 'name', oldValue: 'Al Waha Group', newValue: 'Al Waha Hospitality Group' }],
          }),
        }),
      );
    });

    it('AC: a property-level UPDATE produces an entityChange scoped by both propertyId and its parent chainId', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'u1',
        action: 'UPDATE_PROPERTY',
        entityType: 'Property',
        entityId: 'p1',
        before: { id: 'p1', chainId: 'c1', name: 'Jeddah Hotel' },
        after: { id: 'p1', chainId: 'c1', name: 'Jeddah Hotel (Renamed)' },
      });

      expect(activityBus.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityChange: expect.objectContaining({
            propertyId: 'p1',
            chainId: 'c1',
            outletId: undefined,
            entries: [{ fieldName: 'name', oldValue: 'Jeddah Hotel', newValue: 'Jeddah Hotel (Renamed)' }],
          }),
        }),
      );
    });

    it('produces no entityChange for User-level actions — a User has no chain/property/outlet of its own (documented backlog)', async () => {
      const { service, activityBus } = buildService();

      await service.record({
        userId: 'admin1',
        action: 'INVITE_USER',
        entityType: 'User',
        entityId: 'u2',
        after: { email: 'new@example.com' },
      });

      expect(activityBus.record).toHaveBeenCalledWith(expect.objectContaining({ entityChange: undefined }));
    });

    it('produces no entityChange for sensitive-field actions (password/2FA resets) even when outletId happens to be absent by design', async () => {
      const { service, activityBus } = buildService();

      await service.record({ userId: 'admin1', action: 'ADMIN_RESET_PASSWORD', entityType: 'User', entityId: 'u2' });

      expect(activityBus.record).toHaveBeenCalledWith(expect.objectContaining({ entityChange: undefined }));
    });
  });
});

import { ActivityLogListener } from './activity-log.listener';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { ActivityRecordedEvent } from '../events/activity-recorded.event';

describe('ActivityLogListener', () => {
  function buildListener() {
    const activityLogRepository: Partial<ActivityLogRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'al1' }),
    };
    const listener = new ActivityLogListener(activityLogRepository as ActivityLogRepository);
    return { listener, activityLogRepository };
  }

  it('always writes exactly one ActivityLog row for any recorded event', async () => {
    const { listener, activityLogRepository } = buildListener();
    const event: ActivityRecordedEvent = {
      userId: 'u1',
      category: 'SETTINGS',
      action: 'CREATE_CHAIN',
      entityType: 'Chain',
      entityId: 'c1',
      chainId: 'c1',
      descriptionKey: 'activity.chain.create_chain',
      metadata: { after: { name: 'Al Waha Group' } },
    };

    await listener.handle(event);

    expect(activityLogRepository.create).toHaveBeenCalledTimes(1);
    expect(activityLogRepository.create).toHaveBeenCalledWith({
      chainId: 'c1',
      propertyId: undefined,
      outletId: undefined,
      userId: 'u1',
      category: 'SETTINGS',
      action: 'CREATE_CHAIN',
      entityType: 'Chain',
      entityId: 'c1',
      description: 'activity.chain.create_chain',
      metadata: { after: { name: 'Al Waha Group' } },
      ipAddress: undefined,
      deviceInfo: undefined,
    });
  });

  it('writes an ActivityLog row even when the event carries no entityChange payload (e.g. login/logout)', async () => {
    const { listener, activityLogRepository } = buildListener();
    const event: ActivityRecordedEvent = {
      userId: 'u1',
      category: 'AUTH',
      action: 'LOGIN_SUCCESS',
      descriptionKey: 'activity.auth.login_success',
    };

    await listener.handle(event);

    expect(activityLogRepository.create).toHaveBeenCalledTimes(1);
  });
});

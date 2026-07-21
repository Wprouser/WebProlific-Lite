import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ACTIVITY_RECORDED_EVENT, ActivityRecordedEvent } from '../events/activity-recorded.event';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { ACTIVITY_LOG_REPOSITORY } from '../repositories/tokens';

/**
 * Every `activity.recorded` event, from anywhere in the system, lands here
 * and produces exactly one ActivityLog row. Field-level change tracking
 * (TransactionLog) is a separate concern handled by `TransactionLogListener`
 * off the `entity.changed` event — not every activity changes entity data
 * (login, logout, a report export), so the two are deliberately decoupled.
 */
@Injectable()
export class ActivityLogListener {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY) private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  @OnEvent(ACTIVITY_RECORDED_EVENT)
  async handle(event: ActivityRecordedEvent): Promise<void> {
    await this.activityLogRepository.create({
      chainId: event.chainId,
      propertyId: event.propertyId,
      outletId: event.outletId,
      userId: event.userId,
      category: event.category,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      description: event.descriptionKey,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      deviceInfo: event.deviceInfo,
    });
  }
}

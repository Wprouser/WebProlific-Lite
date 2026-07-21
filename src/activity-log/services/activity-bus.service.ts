import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACTIVITY_RECORDED_EVENT, ActivityRecordedEvent } from '../events/activity-recorded.event';
import { ENTITY_CHANGED_EVENT } from '../events/entity-changed.event';

/**
 * FR-18's domain-event bus, in one line: "services emit `activity.recorded`
 * and `entity.changed` events ... after a successful write." One call
 * site (`record()`) covers both — it always emits `activity.recorded`, and
 * additionally emits `entity.changed` when the event carries an
 * `entityChange` payload (most mutations do; login/logout/report-export
 * don't). `ActivityLogListener` and `TransactionLogListener` are the only
 * places that know how to turn these into rows — call sites never touch
 * those repositories directly.
 *
 * Uses `emitAsync` (and awaits it) rather than `emit` — a test asserting
 * "this write produced exactly one ActivityLog/TransactionLog row" needs
 * the listeners to have actually finished before the request/test
 * proceeds, not fired into the void.
 */
@Injectable()
export class ActivityBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async record(event: ActivityRecordedEvent): Promise<void> {
    await this.eventEmitter.emitAsync(ACTIVITY_RECORDED_EVENT, event);
    if (event.entityChange) {
      await this.eventEmitter.emitAsync(ENTITY_CHANGED_EVENT, event.entityChange);
    }
  }
}

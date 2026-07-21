import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ENTITY_CHANGED_EVENT, EntityChangedEvent } from '../events/entity-changed.event';
import { TransactionLogRepository } from '../repositories/transaction-log.repository';
import { TRANSACTION_LOG_REPOSITORY } from '../repositories/tokens';
import { Operation } from '../constants/enums';

// Message keys, not frozen sentences — rendered at read time using the
// row's own entityType/fieldName/oldValue/newValue as interpolation data,
// same "localized at render time" pattern as ActivityLog.description.
// One generic key per operation covers every entity type, since the
// specifics live in the row's own columns, not in the summary string.
const SUMMARY_KEYS: Record<Operation, string> = {
  CREATE: 'activity.transactionLog.created',
  UPDATE: 'activity.transactionLog.fieldChanged',
  DELETE: 'activity.transactionLog.deleted',
};

/**
 * FR-18 (revised): every `entity.changed` event produces one TransactionLog
 * row per entry — one per changed field for UPDATE, one row for CREATE/
 * DELETE. Separate from ActivityLogListener because not every activity
 * emits this event at all (see EntityChangedEvent's doc comment).
 */
@Injectable()
export class TransactionLogListener {
  constructor(
    @Inject(TRANSACTION_LOG_REPOSITORY)
    private readonly transactionLogRepository: TransactionLogRepository,
  ) {}

  @OnEvent(ENTITY_CHANGED_EVENT)
  async handle(event: EntityChangedEvent): Promise<void> {
    for (const entry of event.entries) {
      await this.transactionLogRepository.create({
        outletId: event.outletId,
        propertyId: event.propertyId,
        chainId: event.chainId,
        entityCategory: event.entityCategory,
        entityType: event.entityType,
        entityId: event.entityId,
        operation: event.operation,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        valueAmount: entry.valueAmount,
        currencyCode: entry.currencyCode,
        performedById: event.performedById,
        summary: SUMMARY_KEYS[event.operation],
      });
    }
  }
}

import { TransactionLog } from '../domain/transaction-log.entity';
import { EntityCategory, Operation } from '../constants/enums';

export interface CreateTransactionLogInput {
  outletId?: string;
  propertyId?: string;
  chainId?: string;
  entityCategory: EntityCategory;
  entityType: string;
  entityId: string;
  operation: Operation;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  valueAmount?: number;
  currencyCode?: string;
  performedById?: string;
  summary: string;
}

export interface TransactionLogFilters {
  /** The caller's effective access — every result row must satisfy the
   * scoping rule the repository implements (outlet-level OR property-level
   * OR chain-level, matching the row's own populated scope column), never
   * just the explicit filters below on their own. */
  accessibleChainIds: string[];
  accessiblePropertyIds: string[];
  accessibleOutletIds: string[];
  outletId?: string;
  propertyId?: string;
  chainId?: string;
  entityCategory?: EntityCategory;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TransactionLogRepository {
  create(data: CreateTransactionLogInput): Promise<TransactionLog>;
  findScoped(filters: TransactionLogFilters): Promise<TransactionLog[]>;
}

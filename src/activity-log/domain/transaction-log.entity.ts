import { EntityCategory, Operation } from '../constants/enums';

export interface TransactionLog {
  id: string;
  outletId: string | null;
  chainId: string | null;
  propertyId: string | null;
  entityCategory: EntityCategory;
  entityType: string;
  entityId: string;
  operation: Operation;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  valueAmount: string | null; // Prisma Decimal serializes as a string at the repository boundary
  currencyCode: string | null;
  performedById: string | null;
  summary: string;
  createdAt: Date;
}

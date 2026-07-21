import { ReasonCode, ReferenceType, TransactionType } from '../constants/enums';

export interface StockTransaction {
  id: string;
  outletId: string;
  itemId: string;
  type: TransactionType;
  quantity: string;
  balanceAfter: string;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  reasonCode: ReasonCode | null;
  photoUrl: string | null;
  performedById: string;
  createdAt: Date;
}

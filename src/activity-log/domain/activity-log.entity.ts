import { ActivityCategory } from '../constants/enums';

export interface ActivityLog {
  id: string;
  chainId: string | null;
  propertyId: string | null;
  outletId: string | null;
  userId: string | null;
  category: ActivityCategory;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: Date;
}

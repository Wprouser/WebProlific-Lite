import { Role, ScopeType } from '../constants/enums';

export interface UserAccess {
  id: string;
  userId: string;
  scopeType: ScopeType;
  scopeId: string;
  role: Role;
  createdAt: Date;
}

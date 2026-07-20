import { UserAccess } from '../domain/user-access.entity';
import { Role, ScopeType } from '../constants/enums';

export interface CreateUserAccessInput {
  userId: string;
  scopeType: ScopeType;
  scopeId: string;
  role: Role;
}

export interface UserAccessRepository {
  findByUserId(userId: string): Promise<UserAccess[]>;
  create(data: CreateUserAccessInput): Promise<UserAccess>;
}

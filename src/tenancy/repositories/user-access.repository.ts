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
  /** Distinct userIds holding any grant at the given scope type over any of the given scope ids. */
  findUserIdsByScope(scopeType: ScopeType, scopeIds: string[]): Promise<string[]>;
  /** FR-14: removes a single grant (part of PATCH /users/:id/access). */
  remove(id: string): Promise<void>;
}

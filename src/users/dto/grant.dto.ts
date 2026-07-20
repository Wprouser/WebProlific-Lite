import { IsIn, IsString } from 'class-validator';
import { ROLES, Role, SCOPE_TYPES, ScopeType } from '../../tenancy/constants/enums';

export class GrantDto {
  @IsIn(SCOPE_TYPES)
  scopeType!: ScopeType;

  @IsString()
  scopeId!: string;

  @IsIn(ROLES)
  role!: Role;
}

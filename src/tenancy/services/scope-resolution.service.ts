import { Inject, Injectable } from '@nestjs/common';
import {
  OUTLET_REPOSITORY,
  PROPERTY_REPOSITORY,
  USER_ACCESS_REPOSITORY,
} from '../repositories/tokens';
import { OutletRepository } from '../repositories/outlet.repository';
import { PropertyRepository } from '../repositories/property.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { Role, ScopeType, higherPrivilegeRole } from '../constants/enums';

export interface ResolvedGrant {
  scopeType: ScopeType;
  scopeId: string;
  role: Role;
}

export interface EffectiveAccess {
  userId: string;
  /** Union of every outlet id the user can reach, across all their grants. */
  effectiveOutletIds: string[];
  /** Highest-privilege role across all grants — a coarse, whole-user summary
   *  (e.g. for display), NOT sufficient for per-resource authorization. */
  effectiveRole: Role | undefined;
  /** The raw grants this access was resolved from. */
  grants: ResolvedGrant[];
  /** Highest-privilege role covering this specific chain (direct CHAIN grant only —
   *  there's no higher scope to inherit from). */
  roleForChain(chainId: string): Role | undefined;
  /** Highest-privilege role covering this specific property (a direct PROPERTY
   *  grant, or an inherited CHAIN grant on its parent chain). */
  roleForProperty(propertyId: string): Role | undefined;
  /** Highest-privilege role covering this specific outlet (a direct OUTLET grant,
   *  or an inherited PROPERTY/CHAIN grant). FR-11 requires role checks to be
   *  resolved per-resource like this, not off the flat effectiveRole. */
  roleForOutlet(outletId: string): Role | undefined;
}

/**
 * FR-00 "Resolving effective outlet access": runs once per request (in
 * ScopeResolutionGuard) to turn a user's UserAccess grants — which may sit
 * at CHAIN, PROPERTY, or OUTLET scope — into flat, per-resource role lookups,
 * so every other module can keep filtering/authorizing by outletId (or
 * propertyId/chainId) exactly as before, just checked against this resolved
 * set instead of a flat role on the user.
 */
@Injectable()
export class ScopeResolutionService {
  constructor(
    @Inject(USER_ACCESS_REPOSITORY)
    private readonly userAccessRepository: UserAccessRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(OUTLET_REPOSITORY)
    private readonly outletRepository: OutletRepository,
  ) {}

  async resolveEffectiveAccess(userId: string): Promise<EffectiveAccess> {
    const grants = await this.userAccessRepository.findByUserId(userId);

    const chainRoleMap = new Map<string, Role>();
    const propertyRoleMap = new Map<string, Role>();
    const outletRoleMap = new Map<string, Role>();

    const upgrade = (map: Map<string, Role>, id: string, role: Role) => {
      const existing = map.get(id);
      map.set(id, existing ? higherPrivilegeRole(existing, role) : role);
    };

    for (const grant of grants) {
      switch (grant.scopeType) {
        case 'OUTLET':
          upgrade(outletRoleMap, grant.scopeId, grant.role);
          break;
        case 'PROPERTY': {
          upgrade(propertyRoleMap, grant.scopeId, grant.role);
          const outletIds = await this.outletRepository.findIdsByPropertyId(grant.scopeId);
          for (const outletId of outletIds) upgrade(outletRoleMap, outletId, grant.role);
          break;
        }
        case 'CHAIN': {
          upgrade(chainRoleMap, grant.scopeId, grant.role);
          const propertyIds = await this.propertyRepository.findIdsByChainId(grant.scopeId);
          for (const propertyId of propertyIds) upgrade(propertyRoleMap, propertyId, grant.role);
          const outletIds = await this.outletRepository.findIdsByChainId(grant.scopeId);
          for (const outletId of outletIds) upgrade(outletRoleMap, outletId, grant.role);
          break;
        }
      }
    }

    const effectiveRole = grants.reduce<Role | undefined>(
      (acc, g) => (acc ? higherPrivilegeRole(acc, g.role) : g.role),
      undefined,
    );

    return {
      userId,
      effectiveOutletIds: Array.from(outletRoleMap.keys()),
      effectiveRole,
      grants: grants.map((g) => ({
        scopeType: g.scopeType,
        scopeId: g.scopeId,
        role: g.role,
      })),
      roleForChain: (chainId: string) => chainRoleMap.get(chainId),
      roleForProperty: (propertyId: string) => propertyRoleMap.get(propertyId),
      roleForOutlet: (outletId: string) => outletRoleMap.get(outletId),
    };
  }
}

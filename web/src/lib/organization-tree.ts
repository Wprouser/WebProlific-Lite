import { chainsApi } from './chains-api';
import { propertiesApi } from './properties-api';
import { type ApiOutletWithHierarchyNames } from './outlets-api';

export interface TreeOutlet {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface TreeProperty {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  outlets: TreeOutlet[];
}

export interface OrganizationTree {
  chainName: string | undefined;
  chainBaseCurrency: string | undefined;
  properties: TreeProperty[];
}

const EMPTY_TREE: OrganizationTree = { chainName: undefined, chainBaseCurrency: undefined, properties: [] };

/**
 * The two access-shaped ways to load "my organization structure" (FR-00):
 * a direct CHAIN grant (CHAIN_OWNER) → one GET /chains/:id/hierarchy call;
 * PROPERTY grants only (PROPERTY_MANAGER) → one GET /properties/:id call
 * per accessible property, no chain node at all — roleForChain doesn't
 * inherit from a PROPERTY grant, so there is no endpoint that could ever
 * resolve a PROPERTY_MANAGER's own chain name.
 *
 * Shared by Organization.tsx and ContextSwitcher.tsx so this branching has
 * exactly one place to be correct — see groupOutletsIntoTree below for the
 * third path (OUTLET-only grants) that only the switcher needs.
 */
export async function loadOrganizationTree(
  chainId: string | undefined,
  propertyIds: string[],
): Promise<OrganizationTree> {
  if (chainId) {
    const hierarchy = await chainsApi.getHierarchy(chainId);
    return { chainName: hierarchy.name, chainBaseCurrency: hierarchy.baseCurrency, properties: hierarchy.properties };
  }
  if (propertyIds.length > 0) {
    const results = await Promise.all(propertyIds.map((id) => propertiesApi.get(id)));
    return {
      chainName: undefined,
      chainBaseCurrency: undefined,
      properties: results.map((p) => ({ id: p.id, name: p.name, type: p.type, isActive: p.isActive, outlets: p.outlets })),
    };
  }
  return EMPTY_TREE;
}

/**
 * The third path — an OUTLET_MANAGER/STORE_STAFF/CHEF has neither a CHAIN
 * nor a PROPERTY grant, so loadOrganizationTree above returns nothing for
 * them. GET /outlets is the one endpoint every role can reach regardless
 * of scope level, enriched with propertyName/chainName for exactly this
 * reason (see OutletWithHierarchyNames) — grouped here into the same
 * TreeProperty[] shape so the header Context Switcher can render any role
 * uniformly. `type`/`isActive` on the synthesized property nodes are
 * placeholders (unknowable from an outlet row alone) — harmless, since
 * only Organization.tsx renders those fields, and it never takes this path
 * (the nav item that reaches it is hidden for these roles).
 */
export function groupOutletsIntoTree(outlets: ApiOutletWithHierarchyNames[]): OrganizationTree {
  if (outlets.length === 0) return EMPTY_TREE;
  const byProperty = new Map<string, TreeProperty>();
  for (const outlet of outlets) {
    let property = byProperty.get(outlet.propertyId);
    if (!property) {
      property = { id: outlet.propertyId, name: outlet.propertyName, type: '', isActive: true, outlets: [] };
      byProperty.set(outlet.propertyId, property);
    }
    property.outlets.push({ id: outlet.id, name: outlet.name, type: outlet.type, isActive: outlet.isActive });
  }
  return { chainName: outlets[0]!.chainName, chainBaseCurrency: undefined, properties: [...byProperty.values()] };
}

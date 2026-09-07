import { apiClient } from './api-client';

export interface ApiChain {
  id: string;
  name: string;
  baseCurrency: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiChainHierarchyOutlet {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface ApiChainHierarchyProperty {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  outlets: ApiChainHierarchyOutlet[];
}

export interface ApiChainHierarchy extends ApiChain {
  properties: ApiChainHierarchyProperty[];
}

export interface UpdateChainInput {
  name?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
}

/**
 * FR-00's Organization screen. Only reachable with a *direct* CHAIN-scope
 * grant — roleForChain doesn't inherit from a PROPERTY or OUTLET grant, so
 * a PROPERTY_MANAGER gets a 403 here and must instead load their own
 * properties individually via propertiesApi (see Organization.tsx's
 * two-path data loading).
 */
export const chainsApi = {
  getHierarchy: (chainId: string) => apiClient.get<ApiChainHierarchy>(`/chains/${chainId}/hierarchy`),
  update: (chainId: string, input: UpdateChainInput) => apiClient.patch<ApiChain>(`/chains/${chainId}`, input),
};

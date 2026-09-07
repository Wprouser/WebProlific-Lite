import { apiClient } from './api-client';

export interface ApiOutletCurrencySettings {
  baseCurrency: string;
  supportedCurrencies: string[];
}

export interface ApiOutlet {
  id: string;
  propertyId: string;
  chainId: string;
  name: string;
  type: string;
  baseCurrency: string;
  poApprovalThreshold: string | null;
  isActive: boolean;
}

/** GET /outlets' shape — every role can reach this endpoint regardless of
 * scope level, which is why it's enriched with the owning property/chain's
 * name (FR-00): roleForProperty/roleForChain don't inherit from an
 * OUTLET-scope grant, so this is the only endpoint that can ever resolve
 * those names for an OUTLET_MANAGER/STORE_STAFF/CHEF. */
export interface ApiOutletWithHierarchyNames extends ApiOutlet {
  propertyName: string;
  chainName: string;
}

export interface CreateOutletInput {
  name: string;
  type: string;
  baseCurrency?: string;
  poApprovalThreshold?: string;
}

export interface UpdateOutletInput {
  name?: string;
  type?: string;
  poApprovalThreshold?: string;
  isActive?: boolean;
}

/** FR-16: base currency is per-outlet (unlike Currency/ExchangeRate
 * themselves) and heavily restricted — see the Currency Configuration
 * screen for the CHAIN_OWNER-only, 409-if-transactional-history rule. */
export const outletsApi = {
  /**
   * Every outlet the caller can reach, with hierarchy names. Originally
   * added for FR-08's New Transfer screen (a real outlet picker); FR-00's
   * Organization screen and Context Switcher are the first to need the
   * enriched propertyName/chainName fields too.
   */
  listAccessible: () => apiClient.get<ApiOutletWithHierarchyNames[]>('/outlets'),
  get: (outletId: string) => apiClient.get<ApiOutlet>(`/outlets/${outletId}`),
  create: (propertyId: string, input: CreateOutletInput) =>
    apiClient.post<ApiOutlet>(`/properties/${propertyId}/outlets`, input),
  update: (outletId: string, input: UpdateOutletInput) =>
    apiClient.patch<ApiOutlet>(`/outlets/${outletId}`, input),
  getCurrencySettings: (outletId: string) =>
    apiClient.get<ApiOutletCurrencySettings>(`/outlets/${outletId}/currency-settings`),
  updateCurrencySettings: (outletId: string, baseCurrency: string) =>
    apiClient.patch<ApiOutletCurrencySettings>(`/outlets/${outletId}/currency-settings`, { baseCurrency }),
};

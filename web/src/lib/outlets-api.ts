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
  isActive: boolean;
}

/** FR-16: base currency is per-outlet (unlike Currency/ExchangeRate
 * themselves) and heavily restricted — see the Currency Configuration
 * screen for the CHAIN_OWNER-only, 409-if-transactional-history rule. */
export const outletsApi = {
  /**
   * Every outlet the caller can reach. Not in FR-00's original endpoint
   * table — added for FR-08's New Transfer screen, the first screen that
   * genuinely needs a real source/destination outlet picker rather than
   * every prior screen's single-default-outlet pattern
   * (`getSession()?.user.effectiveOutletIds[0]`).
   */
  listAccessible: () => apiClient.get<ApiOutlet[]>('/outlets'),
  getCurrencySettings: (outletId: string) =>
    apiClient.get<ApiOutletCurrencySettings>(`/outlets/${outletId}/currency-settings`),
  updateCurrencySettings: (outletId: string, baseCurrency: string) =>
    apiClient.patch<ApiOutletCurrencySettings>(`/outlets/${outletId}/currency-settings`, { baseCurrency }),
};

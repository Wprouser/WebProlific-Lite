import { apiClient } from './api-client';

export interface ApiDashboardMetrics {
  activeItemCount: number;
  stockValuation: string;
  currency: string;
  isConverted: boolean;
  openLowStockAlerts: number;
  pendingPoApprovals: number;
  transfersInTransit: number;
}

export interface ApiOutletDashboard extends ApiDashboardMetrics {
  outletId: string;
  outletName: string;
}

export interface ApiPropertyDashboard extends ApiDashboardMetrics {
  propertyId: string;
  propertyName: string;
  outletCount: number;
}

export interface ApiChainDashboard extends ApiDashboardMetrics {
  chainId: string;
  chainName: string;
  propertyCount: number;
  outletCount: number;
}

/** FR-08's consolidated dashboard. Property/chain views exist server-side
 * and are fully covered by e2e reconciliation tests, but aren't consumed
 * here yet — there's no real property/chain picker to drive them from
 * until the FR-00 Organization/Outlets screen wires up a real Context
 * Switcher (still mock-data-driven; see ContextSwitcher.tsx). */
export const dashboardApi = {
  getOutlet: (outletId: string) => apiClient.get<ApiOutletDashboard>(`/dashboard/outlet/${outletId}`),
  getProperty: (propertyId: string) => apiClient.get<ApiPropertyDashboard>(`/dashboard/property/${propertyId}`),
  getChain: (chainId: string) => apiClient.get<ApiChainDashboard>(`/dashboard/chain/${chainId}`),
};

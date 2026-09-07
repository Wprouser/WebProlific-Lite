import { apiClient } from './api-client';

export type TransferStatus = 'REQUESTED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface ApiTransferLine {
  id: string;
  transferId: string;
  itemId: string;
  destItemId: string;
  quantity: string;
  actualReceivedQty: string | null;
  varianceFlagged: boolean;
}

export interface ApiTransferLineWithItems extends ApiTransferLine {
  itemName: string;
  itemUnitAbbreviation: string;
  destItemName: string;
  destItemUnitAbbreviation: string;
}

export interface ApiTransfer {
  id: string;
  sourceOutletId: string;
  destOutletId: string;
  status: TransferStatus;
  requestedById: string;
  dispatchedById: string | null;
  receivedById: string | null;
  lines: ApiTransferLine[];
  createdAt: string;
  dispatchedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
}

export interface ApiTransferWithOutlets extends ApiTransfer {
  sourceOutletName: string;
  destOutletName: string;
}

export interface ApiTransferDetail extends ApiTransferWithOutlets {
  lines: ApiTransferLineWithItems[];
}

export interface CreateTransferLineInput {
  itemId: string;
  quantity: string;
  /** Omit to let the server auto-resolve by barcode/name match against the
   * destination outlet's catalogue; the review step below shows the
   * suggestion and lets the user override it before submitting. */
  destItemId?: string;
}

export interface CreateTransferInput {
  sourceOutletId: string;
  destOutletId: string;
  lines: CreateTransferLineInput[];
}

export interface ReceiveTransferLineInput {
  transferLineId: string;
  actualReceivedQty: string;
}

export interface TransferFilters {
  outletId?: string;
  status?: TransferStatus;
}

function buildQuery(filters: TransferFilters): string {
  const params = new URLSearchParams();
  if (filters.outletId) params.set('outletId', filters.outletId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const transfersApi = {
  list: (filters: TransferFilters = {}) =>
    apiClient.get<ApiTransferWithOutlets[]>(`/transfers${buildQuery(filters)}`),
  get: (id: string) => apiClient.get<ApiTransferDetail>(`/transfers/${id}`),
  create: (input: CreateTransferInput) => apiClient.post<ApiTransfer>('/transfers', input),
  dispatch: (id: string) => apiClient.patch<ApiTransfer>(`/transfers/${id}/dispatch`),
  receive: (id: string, lines: ReceiveTransferLineInput[]) =>
    apiClient.patch<ApiTransfer>(`/transfers/${id}/receive`, { lines }),
  cancel: (id: string) => apiClient.patch<ApiTransfer>(`/transfers/${id}/cancel`),
};

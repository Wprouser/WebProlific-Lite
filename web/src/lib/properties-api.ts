import { apiClient } from './api-client';

export interface ApiPropertyOutlet {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface ApiProperty {
  id: string;
  chainId: string;
  name: string;
  type: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
}

export interface ApiPropertyWithOutlets extends ApiProperty {
  outlets: ApiPropertyOutlet[];
}

export interface CreatePropertyInput {
  name: string;
  type: string;
  address?: string;
  timezone?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  type?: string;
  address?: string;
  timezone?: string;
  isActive?: boolean;
}

/**
 * FR-00's Organization screen. `get` is reachable by a direct PROPERTY
 * grant or an inherited CHAIN grant — this is how a PROPERTY_MANAGER loads
 * their own property tree(s) when chainsApi.getHierarchy (CHAIN-scope
 * only) isn't reachable for them.
 */
export const propertiesApi = {
  get: (propertyId: string) => apiClient.get<ApiPropertyWithOutlets>(`/properties/${propertyId}`),
  create: (chainId: string, input: CreatePropertyInput) =>
    apiClient.post<ApiProperty>(`/chains/${chainId}/properties`, input),
  update: (propertyId: string, input: UpdatePropertyInput) =>
    apiClient.patch<ApiProperty>(`/properties/${propertyId}`, input),
};

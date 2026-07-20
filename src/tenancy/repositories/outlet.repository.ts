import { Outlet } from '../domain/outlet.entity';

export interface CreateOutletInput {
  propertyId: string;
  chainId: string;
  name: string;
  type: string;
  baseCurrency?: string;
  poApprovalThreshold?: string;
}

export interface UpdateOutletInput {
  name?: string;
  type?: string;
  baseCurrency?: string;
  poApprovalThreshold?: string;
  isActive?: boolean;
}

export interface OutletRepository {
  create(data: CreateOutletInput): Promise<Outlet>;
  findById(id: string): Promise<Outlet | null>;
  update(id: string, data: UpdateOutletInput): Promise<Outlet>;
  /** All outlet ids under every property of the given chain — used to expand a CHAIN-scoped grant. */
  findIdsByChainId(chainId: string): Promise<string[]>;
  /** All outlet ids under the given property — used to expand a PROPERTY-scoped grant. */
  findIdsByPropertyId(propertyId: string): Promise<string[]>;
  deactivateManyByPropertyId(propertyId: string): Promise<void>;
  deactivateManyByChainId(chainId: string): Promise<void>;
}

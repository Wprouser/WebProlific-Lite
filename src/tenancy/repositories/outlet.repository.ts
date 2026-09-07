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
  /** Every outlet in this set, name included — FR-08 (Transfers) is the
   * first screen genuinely needing a real outlet picker rather than
   * operating on the caller's single default outlet, so this is a small,
   * necessary addition rather than a full fix for the still-mocked FR-00
   * context switcher (see ContextSwitcher.tsx). */
  findByIds(ids: string[]): Promise<Outlet[]>;
}

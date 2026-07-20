import { Chain, ChainHierarchy } from '../domain/chain.entity';

export interface CreateChainInput {
  name: string;
  baseCurrency?: string;
  subscriptionPlan?: string;
}

export interface UpdateChainInput {
  name?: string;
  baseCurrency?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
}

export interface ChainRepository {
  create(data: CreateChainInput): Promise<Chain>;
  findById(id: string): Promise<Chain | null>;
  findHierarchy(id: string): Promise<ChainHierarchy | null>;
  update(id: string, data: UpdateChainInput): Promise<Chain>;
  /** Deactivates the chain and cascades soft-deactivation to every property and outlet beneath it. */
  deactivateCascade(id: string): Promise<void>;
}

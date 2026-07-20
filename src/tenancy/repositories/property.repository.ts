import { Property, PropertyWithOutlets } from '../domain/property.entity';

export interface CreatePropertyInput {
  chainId: string;
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

export interface PropertyRepository {
  create(data: CreatePropertyInput): Promise<Property>;
  findById(id: string): Promise<PropertyWithOutlets | null>;
  update(id: string, data: UpdatePropertyInput): Promise<Property>;
  /** Deactivates the property and cascades soft-deactivation to every outlet beneath it. */
  deactivateCascade(id: string): Promise<void>;
  /** All property ids under the given chain — used to expand a CHAIN-scoped grant. */
  findIdsByChainId(chainId: string): Promise<string[]>;
}

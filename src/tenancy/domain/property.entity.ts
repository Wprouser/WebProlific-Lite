export interface Property {
  id: string;
  chainId: string;
  name: string;
  type: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
}

export interface PropertyWithOutlets extends Property {
  outlets: Array<{ id: string; name: string; type: string; isActive: boolean }>;
}

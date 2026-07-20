export interface Chain {
  id: string;
  name: string;
  baseCurrency: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ChainHierarchy extends Chain {
  properties: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    outlets: Array<{ id: string; name: string; type: string; isActive: boolean }>;
  }>;
}

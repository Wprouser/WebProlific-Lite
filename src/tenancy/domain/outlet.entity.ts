export interface Outlet {
  id: string;
  propertyId: string;
  chainId: string;
  name: string;
  type: string;
  baseCurrency: string;
  poApprovalThreshold: string | null; // Decimal serialized as string at the repository boundary
  isActive: boolean;
}

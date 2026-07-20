export interface User {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  preferredLanguage: string;
  preferredCurrency: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

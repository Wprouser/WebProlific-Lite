export interface User {
  id: string;
  email: string;
  phone: string | null;
  // Null for an invited-but-not-yet-activated user (FR-14).
  passwordHash: string | null;
  preferredLanguage: string;
  preferredCurrency: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

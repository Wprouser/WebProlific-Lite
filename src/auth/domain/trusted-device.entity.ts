export interface TrustedDevice {
  id: string;
  userId: string;
  deviceToken: string; // sha256 hash of the raw client-side token
  deviceLabel: string | null;
  expiresAt: Date;
  createdAt: Date;
}

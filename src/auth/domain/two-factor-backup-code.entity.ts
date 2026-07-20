export interface TwoFactorBackupCode {
  id: string;
  twoFactorAuthId: string;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

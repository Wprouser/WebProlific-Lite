import { TwoFactorBackupCode } from '../domain/two-factor-backup-code.entity';

export interface TwoFactorBackupCodeRepository {
  /** Inserts a fresh batch of hashed backup codes (a related row per code). */
  createBatch(twoFactorAuthId: string, codeHashes: string[]): Promise<TwoFactorBackupCode[]>;
  findUnusedByTwoFactorAuthId(twoFactorAuthId: string): Promise<TwoFactorBackupCode[]>;
  markUsed(id: string): Promise<TwoFactorBackupCode>;
  /** Deletes all unused codes for a TwoFactorAuth — used before regenerating. */
  deleteUnused(twoFactorAuthId: string): Promise<void>;
}

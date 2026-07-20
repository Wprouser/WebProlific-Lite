import { RefreshToken } from '../domain/refresh-token.entity';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceInfo?: string;
}

export interface RefreshTokenRepository {
  create(data: CreateRefreshTokenInput): Promise<RefreshToken>;
  /** Looks up by the hashed token — does not filter revoked/expired, caller decides. */
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<RefreshToken>;
  revokeAllForUser(userId: string): Promise<void>;
}

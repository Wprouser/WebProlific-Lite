import { InviteToken } from '../domain/invite-token.entity';

export interface CreateInviteTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface InviteTokenRepository {
  create(data: CreateInviteTokenInput): Promise<InviteToken>;
  findByTokenHash(tokenHash: string): Promise<InviteToken | null>;
  markUsed(id: string): Promise<InviteToken>;
  /** Invalidates any still-unused invite tokens for a user — called before
   * issuing a fresh one on resend, so only the latest is valid. */
  invalidateUnusedForUser(userId: string): Promise<void>;
}

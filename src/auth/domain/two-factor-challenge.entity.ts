import { TwoFactorMethod } from '../constants/enums';

/**
 * Also the backing record for the `pendingTwoFactorToken` returned by
 * /auth/login and /auth/2fa/enroll flows — its `id` (a UUIDv4) IS the token
 * handed to the client. See FR-13 plan notes: the spec's TwoFactorChallenge
 * model has no separate token/tokenHash field, unlike RefreshToken /
 * PasswordResetToken, so the id doubles as the single-use, time-boxed
 * opaque credential (consumed via `consumedAt`, bounded via `expiresAt`).
 */
export interface TwoFactorChallenge {
  id: string;
  userId: string;
  code: string | null;
  method: TwoFactorMethod;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
}

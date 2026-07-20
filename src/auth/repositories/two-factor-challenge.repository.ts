import { TwoFactorChallenge } from '../domain/two-factor-challenge.entity';
import { TwoFactorMethod } from '../constants/enums';

export interface CreateTwoFactorChallengeInput {
  userId: string;
  code: string | null;
  method: TwoFactorMethod;
  expiresAt: Date;
}

export interface TwoFactorChallengeRepository {
  create(data: CreateTwoFactorChallengeInput): Promise<TwoFactorChallenge>;
  findById(id: string): Promise<TwoFactorChallenge | null>;
  incrementAttemptCount(id: string): Promise<TwoFactorChallenge>;
  consume(id: string): Promise<TwoFactorChallenge>;
  /** Replaces the hashed code + expiry on an existing challenge (used by /2fa/resend). */
  updateCode(id: string, code: string, expiresAt: Date): Promise<TwoFactorChallenge>;
}

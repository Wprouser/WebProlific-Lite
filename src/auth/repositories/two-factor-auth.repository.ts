import { TwoFactorAuth } from '../domain/two-factor-auth.entity';
import { TwoFactorMethod } from '../constants/enums';

export interface CreateTwoFactorAuthInput {
  userId: string;
  method?: TwoFactorMethod;
}

export interface UpdateTwoFactorAuthInput {
  isEnabled?: boolean;
  method?: TwoFactorMethod;
  totpSecret?: string | null;
  enforcedByPolicy?: boolean;
  enrolledAt?: Date | null;
}

export interface TwoFactorAuthRepository {
  findByUserId(userId: string): Promise<TwoFactorAuth | null>;
  /** Creates a disabled TwoFactorAuth row for the user if one doesn't exist yet. */
  findOrCreateByUserId(userId: string): Promise<TwoFactorAuth>;
  update(userId: string, data: UpdateTwoFactorAuthInput): Promise<TwoFactorAuth>;
}

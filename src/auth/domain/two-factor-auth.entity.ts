import { TwoFactorMethod } from '../constants/enums';

export interface TwoFactorAuth {
  id: string;
  userId: string;
  isEnabled: boolean;
  method: TwoFactorMethod;
  totpSecret: string | null;
  enforcedByPolicy: boolean;
  enrolledAt: Date | null;
}

import { TwoFactorMethod } from '../constants/enums';
import { Role } from '../../tenancy/constants/enums';

export interface LoginSuccessResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    preferredLanguage: string;
    effectiveRole: Role | undefined;
    effectiveOutletIds: string[];
  };
  /** Only present when `trustDevice: true` was requested during 2FA verify. */
  trustedDeviceToken?: string;
}

export interface RequiresTwoFactorResponse {
  requiresTwoFactor: true;
  pendingTwoFactorToken: string;
  method: TwoFactorMethod;
  maskedDestination: string | null;
}

export interface RequiresTwoFactorEnrollmentResponse {
  requiresTwoFactorEnrollment: true;
  /** Authenticates the forced-enrollment /2fa/enroll/* calls — the user has
   * no access token yet at this point. */
  pendingEnrollmentToken: string;
}

export type LoginResponse =
  | LoginSuccessResponse
  | RequiresTwoFactorResponse
  | RequiresTwoFactorEnrollmentResponse;

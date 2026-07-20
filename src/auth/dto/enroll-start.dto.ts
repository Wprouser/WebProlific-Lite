import { IsIn, IsOptional, IsString } from 'class-validator';
import { TWO_FACTOR_METHODS, TwoFactorMethod } from '../constants/enums';

export class EnrollStartDto {
  @IsIn(TWO_FACTOR_METHODS)
  method!: TwoFactorMethod;

  /** Only used for the forced-enrollment flow (no access token yet — see
   * /auth/login's `requiresTwoFactorEnrollment` response). Voluntary
   * enrollment (Settings screen) is authenticated via Bearer token instead. */
  @IsOptional()
  @IsString()
  pendingEnrollmentToken?: string;
}

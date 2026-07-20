import { IsIn, IsOptional, IsString } from 'class-validator';
import { TWO_FACTOR_METHODS, TwoFactorMethod } from '../constants/enums';

export class EnrollConfirmDto {
  @IsIn(TWO_FACTOR_METHODS)
  method!: TwoFactorMethod;

  @IsString()
  code!: string;

  /** Required for SMS/EMAIL (identifies the pending TwoFactorChallenge); unused for TOTP. */
  @IsOptional()
  @IsString()
  enrollmentChallengeId?: string;

  /** See EnrollStartDto — forced-enrollment flow only. */
  @IsOptional()
  @IsString()
  pendingEnrollmentToken?: string;
}

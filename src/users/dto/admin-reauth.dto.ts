import { IsString } from 'class-validator';

/** Shared by /users/:id/reset-password-admin and /users/:id/reset-2fa-admin —
 * both require the acting admin's own password + a fresh 2FA code (spec:
 * "requiring the acting admin's own re-authentication"). */
export class AdminReauthDto {
  @IsString()
  password!: string;

  @IsString()
  code!: string;
}

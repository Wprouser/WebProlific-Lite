import { randomInt } from 'crypto';

/** 6-digit numeric OTP for SMS/EMAIL challenges and backup codes' sibling use. */
export function generateNumericOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** 10-char base32-ish backup code (uppercase letters + digits, no ambiguous chars). */
export function generateBackupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}

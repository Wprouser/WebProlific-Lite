import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ISSUER = 'WebProlific-Lite';
const ALGORITHM = 'aes-256-gcm';

/**
 * TOTP secret generation/verification (otplib, ±1 30s-step drift tolerance
 * per the spec) plus application-level AES-256-GCM encryption of the secret
 * at rest — required by the spec since it's a long-lived shared secret and
 * DB-at-rest encryption alone isn't considered sufficient.
 */
@Injectable()
export class TotpService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    authenticator.options = { window: 1 };
    const rawKey = this.config.get<string>('TOTP_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new Error('TOTP_ENCRYPTION_KEY is not configured');
    }
    this.key = Buffer.from(rawKey, 'base64');
    if (this.key.length !== 32) {
      throw new Error('TOTP_ENCRYPTION_KEY must decode to 32 bytes (AES-256)');
    }
  }

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  keyUri(email: string, secret: string): string {
    return authenticator.keyuri(email, ISSUER, secret);
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  encryptSecret(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(
      ':',
    );
  }

  decryptSecret(payload: string): string {
    const [ivB64, authTagB64, dataB64] = payload.split(':');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}

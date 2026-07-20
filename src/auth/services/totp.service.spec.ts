import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { TotpService } from './totp.service';

function buildService(overrides: Record<string, string> = {}) {
  const config: Partial<ConfigService> = {
    get: jest.fn((key: string) => {
      if (key === 'TOTP_ENCRYPTION_KEY') {
        return overrides.TOTP_ENCRYPTION_KEY ?? 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      }
      return overrides[key];
    }),
  };
  return new TotpService(config as ConfigService);
}

describe('TotpService', () => {
  it('throws at construction if TOTP_ENCRYPTION_KEY is missing', () => {
    const config: Partial<ConfigService> = { get: jest.fn().mockReturnValue(undefined) };
    expect(() => new TotpService(config as ConfigService)).toThrow('TOTP_ENCRYPTION_KEY');
  });

  it('throws at construction if the key does not decode to 32 bytes', () => {
    expect(() => buildService({ TOTP_ENCRYPTION_KEY: 'dG9vc2hvcnQ=' })).toThrow('32 bytes');
  });

  it('encrypts and decrypts a TOTP secret round-trip', () => {
    const service = buildService();
    const secret = service.generateSecret();
    const encrypted = service.encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(service.decryptSecret(encrypted)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV) for the same secret', () => {
    const service = buildService();
    const secret = service.generateSecret();
    expect(service.encryptSecret(secret)).not.toBe(service.encryptSecret(secret));
  });

  it('verifies a currently-valid TOTP code', () => {
    const service = buildService();
    const secret = service.generateSecret();
    const code = authenticator.generate(secret);
    expect(service.verify(code, secret)).toBe(true);
  });

  it('rejects a code from well outside the drift window', () => {
    const service = buildService();
    const secret = service.generateSecret();
    authenticator.options = { epoch: Date.now() + 10 * 60 * 1000 };
    const farFutureCode = authenticator.generate(secret);
    authenticator.resetOptions();
    authenticator.options = { window: 1 };

    expect(service.verify(farFutureCode, secret)).toBe(false);
  });

  it('rejects garbage input without throwing', () => {
    const service = buildService();
    const secret = service.generateSecret();
    expect(service.verify('not-a-code', secret)).toBe(false);
  });

  it('keyUri embeds the account email and issuer for QR rendering', () => {
    const service = buildService();
    const secret = service.generateSecret();
    const uri = service.keyUri('owner@example.com', secret);
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(encodeURIComponent('owner@example.com'));
    expect(uri).toContain('WebProlific-Lite');
  });
});

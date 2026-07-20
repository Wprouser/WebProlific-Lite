import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

function buildService(overrides: Record<string, string> = {}) {
  const jwtService = new JwtService({ secret: 'test-secret' });
  const config: Partial<ConfigService> = {
    get: jest.fn((key: string) => overrides[key]),
  };
  return new TokenService(jwtService, config as ConfigService);
}

describe('TokenService', () => {
  it('signs an access token that verifies back to the same userId', () => {
    const service = buildService();
    const token = service.signAccessToken('user-123');
    expect(service.verifyAccessToken(token).sub).toBe('user-123');
  });

  it('throws on a tampered/invalid access token', () => {
    const service = buildService();
    const token = service.signAccessToken('user-123');
    expect(() => service.verifyAccessToken(token + 'x')).toThrow();
  });

  it('defaults accessTokenExpiresInSeconds to 900 when unset', () => {
    const service = buildService();
    expect(service.accessTokenExpiresInSeconds).toBe(900);
  });

  it('honors JWT_ACCESS_EXPIRES_IN when set', () => {
    const service = buildService({ JWT_ACCESS_EXPIRES_IN: '60' });
    expect(service.accessTokenExpiresInSeconds).toBe(60);
  });

  it('generates high-entropy, unique opaque tokens', () => {
    const service = buildService();
    const a = service.generateOpaqueToken();
    const b = service.generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  it('hashes opaque tokens deterministically (same input -> same hash)', () => {
    const service = buildService();
    const hash1 = service.hashOpaqueToken('same-input');
    const hash2 = service.hashOpaqueToken('same-input');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe('same-input');
  });

  it('different inputs hash to different values', () => {
    const service = buildService();
    expect(service.hashOpaqueToken('a')).not.toBe(service.hashOpaqueToken('b'));
  });

  it('refreshTokenExpiry defaults to ~30 days out', () => {
    const service = buildService();
    const expiry = service.refreshTokenExpiry();
    const days = (expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('trustedDeviceExpiry respects TRUSTED_DEVICE_TTL_DAYS', () => {
    const service = buildService({ TRUSTED_DEVICE_TTL_DAYS: '5' });
    const expiry = service.trustedDeviceExpiry();
    const days = (expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(4.9);
    expect(days).toBeLessThan(5.1);
  });

  it('pendingTwoFactorExpiry respects PENDING_2FA_TOKEN_TTL_MIN', () => {
    const service = buildService({ PENDING_2FA_TOKEN_TTL_MIN: '2' });
    const expiry = service.pendingTwoFactorExpiry();
    const minutes = (expiry.getTime() - Date.now()) / (60 * 1000);
    expect(minutes).toBeGreaterThan(1.9);
    expect(minutes).toBeLessThan(2.1);
  });

  it('passwordResetExpiry is 30 minutes out', () => {
    const service = buildService();
    const expiry = service.passwordResetExpiry();
    const minutes = (expiry.getTime() - Date.now()) / (60 * 1000);
    expect(minutes).toBeGreaterThan(29.9);
    expect(minutes).toBeLessThan(30.1);
  });
});

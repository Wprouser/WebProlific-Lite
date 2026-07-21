import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { TwoFactorAuthRepository } from '../repositories/two-factor-auth.repository';
import { TwoFactorChallengeRepository } from '../repositories/two-factor-challenge.repository';
import { TwoFactorBackupCodeRepository } from '../repositories/two-factor-backup-code.repository';
import { TrustedDeviceRepository } from '../repositories/trusted-device.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { OtpDispatcher } from './otp-dispatcher.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';
import { PasswordService } from './password.service';
import { ScopeResolutionService } from '../../tenancy/services/scope-resolution.service';
import { ActivityBus } from '../../activity-log/services/activity-bus.service';
import { User } from '../domain/user.entity';

function fixtureUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'owner@example.com',
    phone: null,
    passwordHash: 'hashed',
    preferredLanguage: 'en',
    preferredCurrency: 'SAR',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService activity-log emission (FR-18 retrofit)', () => {
  function buildService(userOverrides: Partial<User> = {}, options: { userExists?: boolean } = {}) {
    const user = fixtureUser(userOverrides);
    const userExists = options.userExists ?? true;
    const userRepository: Partial<UserRepository> = {
      findByEmail: jest.fn().mockResolvedValue(userExists ? user : null),
      findById: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    };
    const twoFactorAuthRepository: Partial<TwoFactorAuthRepository> = {
      findByUserId: jest.fn().mockResolvedValue(null),
    };
    const twoFactorChallengeRepository: Partial<TwoFactorChallengeRepository> = {};
    const twoFactorBackupCodeRepository: Partial<TwoFactorBackupCodeRepository> = {};
    const trustedDeviceRepository: Partial<TrustedDeviceRepository> = {};
    const refreshTokenRepository: Partial<RefreshTokenRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'rt1' }),
      findByTokenHash: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    const passwordResetTokenRepository: Partial<PasswordResetTokenRepository> = {
      findByTokenHash: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };
    const otpDispatcher: Partial<OtpDispatcher> = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const tokenService: Partial<TokenService> = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
      generateOpaqueToken: jest.fn().mockReturnValue('opaque-token'),
      hashOpaqueToken: jest.fn((t: string) => `hashed:${t}`),
      refreshTokenExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 100000)),
      passwordResetExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 100000)),
      accessTokenExpiresInSeconds: 900,
    };
    const totpService: Partial<TotpService> = {};
    const passwordService: Partial<PasswordService> = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const scopeResolutionService: Partial<ScopeResolutionService> = {
      resolveEffectiveAccess: jest.fn().mockResolvedValue({
        effectiveRole: undefined,
        effectiveOutletIds: [],
      }),
    };
    const activityBus: Partial<ActivityBus> = { record: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository as UserRepository,
      twoFactorAuthRepository as TwoFactorAuthRepository,
      twoFactorChallengeRepository as TwoFactorChallengeRepository,
      twoFactorBackupCodeRepository as TwoFactorBackupCodeRepository,
      trustedDeviceRepository as TrustedDeviceRepository,
      refreshTokenRepository as RefreshTokenRepository,
      passwordResetTokenRepository as PasswordResetTokenRepository,
      otpDispatcher as OtpDispatcher,
      tokenService as TokenService,
      totpService as TotpService,
      passwordService as PasswordService,
      scopeResolutionService as ScopeResolutionService,
      activityBus as ActivityBus,
    );

    return { service, user, refreshTokenRepository, passwordResetTokenRepository, passwordService, activityBus };
  }

  it('AC: a successful login emits exactly one LOGIN_SUCCESS event', async () => {
    const { service, activityBus } = buildService();

    await service.login({ email: 'owner@example.com', password: 'correct' });

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: 'LOGIN_SUCCESS', userId: 'u1' }),
    );
  });

  it('AC: a wrong password for a real account emits LOGIN_FAILED, not LOGIN_SUCCESS', async () => {
    const { service, passwordService, activityBus } = buildService();
    (passwordService.verify as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'owner@example.com', password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: 'LOGIN_FAILED', userId: 'u1' }),
    );
  });

  it('does not emit LOGIN_FAILED for a nonexistent account — avoids logging scan/bot noise', async () => {
    const { service, activityBus } = buildService({}, { userExists: false });

    await expect(service.login({ email: 'nobody@example.com', password: 'x' })).rejects.toThrow(
      UnauthorizedException,
    );

    expect(activityBus.record).not.toHaveBeenCalled();
  });

  it('token refresh does NOT emit LOGIN_SUCCESS — rotation is not a new login', async () => {
    const { service, refreshTokenRepository, activityBus } = buildService();
    (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });

    await service.refresh({ refreshToken: 'some-refresh-token' });

    expect(activityBus.record).not.toHaveBeenCalled();
  });

  it('AC: logout emits exactly one LOGOUT event', async () => {
    const { service, refreshTokenRepository, activityBus } = buildService();
    (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      revokedAt: null,
    });

    await service.logout({ refreshToken: 'some-refresh-token' });

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: 'LOGOUT', userId: 'u1' }),
    );
  });

  it('AC: a self-service password reset emits exactly one PASSWORD_RESET event', async () => {
    const { service, passwordResetTokenRepository, activityBus } = buildService();
    (passwordResetTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue({
      id: 'prt1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });

    await service.resetPassword({ token: 'reset-token', newPassword: 'NewPassw0rd!' });

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: 'PASSWORD_RESET', userId: 'u1' }),
    );
  });
});

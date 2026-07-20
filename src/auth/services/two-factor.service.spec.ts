import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { UserRepository } from '../repositories/user.repository';
import { TwoFactorAuthRepository } from '../repositories/two-factor-auth.repository';
import { TwoFactorChallengeRepository } from '../repositories/two-factor-challenge.repository';
import { TwoFactorBackupCodeRepository } from '../repositories/two-factor-backup-code.repository';
import { OtpDispatcher } from './otp-dispatcher.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';
import { PasswordService } from './password.service';
import { AuthService } from './auth.service';
import { PropertyRepository } from '../../tenancy/repositories/property.repository';
import { OutletRepository } from '../../tenancy/repositories/outlet.repository';
import { UserAccessRepository } from '../../tenancy/repositories/user-access.repository';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { User } from '../domain/user.entity';
import { TwoFactorAuth } from '../domain/two-factor-auth.entity';

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

function fixtureTwoFactorAuth(overrides: Partial<TwoFactorAuth> = {}): TwoFactorAuth {
  return {
    id: 'tfa1',
    userId: 'u1',
    isEnabled: true,
    method: 'TOTP',
    totpSecret: 'encrypted-secret',
    enforcedByPolicy: false,
    enrolledAt: new Date(),
    ...overrides,
  };
}

describe('TwoFactorService', () => {
  function buildService() {
    const userRepository: Partial<UserRepository> = {
      findById: jest.fn().mockResolvedValue(fixtureUser()),
    };
    const twoFactorAuthRepository: Partial<TwoFactorAuthRepository> = {
      findByUserId: jest.fn().mockResolvedValue(fixtureTwoFactorAuth()),
      findOrCreateByUserId: jest.fn().mockResolvedValue(fixtureTwoFactorAuth({ isEnabled: false })),
      update: jest.fn().mockResolvedValue(fixtureTwoFactorAuth()),
    };
    const twoFactorChallengeRepository: Partial<TwoFactorChallengeRepository> = {};
    const twoFactorBackupCodeRepository: Partial<TwoFactorBackupCodeRepository> = {
      findUnusedByTwoFactorAuthId: jest.fn().mockResolvedValue([]),
      deleteUnused: jest.fn().mockResolvedValue(undefined),
      createBatch: jest.fn().mockResolvedValue([]),
      markUsed: jest.fn(),
    };
    const otpDispatcher: Partial<OtpDispatcher> = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const propertyRepository: Partial<PropertyRepository> = {
      findIdsByChainId: jest.fn().mockResolvedValue(['p1', 'p2']),
    };
    const outletRepository: Partial<OutletRepository> = {
      findIdsByChainId: jest.fn().mockResolvedValue(['o1']),
    };
    const userAccessRepository: Partial<UserAccessRepository> = {
      findUserIdsByScope: jest.fn((scopeType: string) => {
        if (scopeType === 'CHAIN') return Promise.resolve(['u1', 'u2']);
        if (scopeType === 'PROPERTY') return Promise.resolve(['u2', 'u3']);
        return Promise.resolve(['u3']); // OUTLET
      }),
    };
    const tokenService: Partial<TokenService> = {
      hashOpaqueToken: jest.fn((v: string) => `hash(${v})`),
      pendingTwoFactorExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 600_000)),
    };
    const totpService: Partial<TotpService> = {
      generateSecret: jest.fn().mockReturnValue('SECRET'),
      encryptSecret: jest.fn().mockReturnValue('encrypted'),
      decryptSecret: jest.fn().mockReturnValue('SECRET'),
      keyUri: jest.fn().mockReturnValue('otpauth://totp/...'),
      verify: jest.fn().mockReturnValue(false),
    };
    const passwordService: Partial<PasswordService> = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('hashed-code'),
    };
    const authService: Partial<AuthService> = {};

    const service = new TwoFactorService(
      userRepository as UserRepository,
      twoFactorAuthRepository as TwoFactorAuthRepository,
      twoFactorChallengeRepository as TwoFactorChallengeRepository,
      twoFactorBackupCodeRepository as TwoFactorBackupCodeRepository,
      otpDispatcher as OtpDispatcher,
      propertyRepository as PropertyRepository,
      outletRepository as OutletRepository,
      userAccessRepository as UserAccessRepository,
      tokenService as TokenService,
      totpService as TotpService,
      passwordService as PasswordService,
      authService as AuthService,
    );

    return {
      service,
      userRepository,
      twoFactorAuthRepository,
      twoFactorBackupCodeRepository,
      totpService,
      passwordService,
      userAccessRepository,
    };
  }

  function requestWithRole(role: string | undefined) {
    return {
      effectiveAccess: {
        roleForChain: () => role,
      },
    } as unknown as RequestWithAccess;
  }

  describe('setPolicy', () => {
    it('rejects a caller without CHAIN_OWNER on that chain', async () => {
      const { service } = buildService();
      await expect(
        service.setPolicy(requestWithRole('PROPERTY_MANAGER'), {
          chainId: 'c1',
          enforcedByPolicy: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('dedups userIds across CHAIN/PROPERTY/OUTLET scopes and applies the policy to each once', async () => {
      const { service, twoFactorAuthRepository } = buildService();
      const result = await service.setPolicy(requestWithRole('CHAIN_OWNER'), {
        chainId: 'c1',
        enforcedByPolicy: true,
      });

      // u1, u2 (CHAIN + PROPERTY overlap), u3 (PROPERTY + OUTLET overlap) -> 3 distinct.
      expect(result.affectedUsers).toBe(3);
      expect(twoFactorAuthRepository.update).toHaveBeenCalledTimes(3);
      expect(twoFactorAuthRepository.update).toHaveBeenCalledWith('u1', { enforcedByPolicy: true });
      expect(twoFactorAuthRepository.update).toHaveBeenCalledWith('u2', { enforcedByPolicy: true });
      expect(twoFactorAuthRepository.update).toHaveBeenCalledWith('u3', { enforcedByPolicy: true });
    });
  });

  describe('enrollStart', () => {
    it('rejects starting a new enrollment when 2FA is already enabled', async () => {
      const { service, twoFactorAuthRepository } = buildService();
      (twoFactorAuthRepository.findOrCreateByUserId as jest.Mock).mockResolvedValue(
        fixtureTwoFactorAuth({ isEnabled: true }),
      );
      const request = { user: { id: 'u1' } } as RequestWithAccess;
      await expect(service.enrollStart(request, { method: 'TOTP' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws if neither a Bearer token nor a pendingEnrollmentToken resolves a user', async () => {
      const { service } = buildService();
      const request = {} as RequestWithAccess;
      await expect(service.enrollStart(request, { method: 'TOTP' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disable', () => {
    it('rejects with the wrong password before ever checking the 2FA code', async () => {
      const { service, passwordService, totpService } = buildService();
      (passwordService.verify as jest.Mock).mockResolvedValue(false);
      await expect(
        service.disable('u1', { password: 'wrong', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(totpService.verify).not.toHaveBeenCalled();
    });

    it('accepts a valid live TOTP code as the final check', async () => {
      const { service, totpService, twoFactorAuthRepository } = buildService();
      (totpService.verify as jest.Mock).mockReturnValue(true);
      await service.disable('u1', { password: 'correct', code: '123456' });
      expect(twoFactorAuthRepository.update).toHaveBeenCalledWith('u1', {
        isEnabled: false,
        totpSecret: null,
        enrolledAt: null,
      });
    });

    it('falls back to a valid backup code when the TOTP check fails (e.g. SMS/EMAIL method)', async () => {
      const { service, totpService, twoFactorBackupCodeRepository, passwordService } = buildService();
      (totpService.verify as jest.Mock).mockReturnValue(false);
      (twoFactorBackupCodeRepository.findUnusedByTwoFactorAuthId as jest.Mock).mockResolvedValue([
        { id: 'bc1', codeHash: 'hash-of-ABCDEFGHJK' },
      ]);
      // First verify() call (bcrypt on the current password) already
      // resolved true from the shared mock; make the backup-code check also
      // succeed by keeping passwordService.verify true throughout.
      (passwordService.verify as jest.Mock).mockResolvedValue(true);

      await service.disable('u1', { password: 'correct', code: 'ABCDEFGHJK' });
      expect(twoFactorBackupCodeRepository.markUsed).toHaveBeenCalledWith('bc1');
    });

    it('rejects when neither TOTP nor any backup code matches', async () => {
      const { service, totpService, twoFactorBackupCodeRepository, passwordService } = buildService();
      (totpService.verify as jest.Mock).mockReturnValue(false);
      (twoFactorBackupCodeRepository.findUnusedByTwoFactorAuthId as jest.Mock).mockResolvedValue([
        { id: 'bc1', codeHash: 'hash-of-something-else' },
      ]);
      let call = 0;
      (passwordService.verify as jest.Mock).mockImplementation(() => {
        call += 1;
        return Promise.resolve(call === 1); // only the password check passes
      });

      await expect(service.disable('u1', { password: 'correct', code: 'WRONGCODE1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

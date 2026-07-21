import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { AuditLogService } from '../../rbac/services/audit-log.service';
import { ActivityBus } from '../../activity-log/services/activity-bus.service';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

describe('AuthController 2FA activity-log emission (FR-18 retrofit)', () => {
  function buildController() {
    const authService: Partial<AuthService> = {};
    const twoFactorService: Partial<TwoFactorService> = {
      enrollConfirm: jest.fn(),
      disable: jest.fn().mockResolvedValue(undefined),
    };
    const auditLogService: Partial<AuditLogService> = {};
    const activityBus: Partial<ActivityBus> = { record: jest.fn().mockResolvedValue(undefined) };

    const controller = new AuthController(
      authService as AuthService,
      twoFactorService as TwoFactorService,
      auditLogService as AuditLogService,
      activityBus as ActivityBus,
    );
    return { controller, twoFactorService, activityBus };
  }

  it('AC: voluntary 2FA enrollment (already authenticated) emits exactly one 2FA_ENABLED event for request.user.id', async () => {
    const { controller, twoFactorService, activityBus } = buildController();
    (twoFactorService.enrollConfirm as jest.Mock).mockResolvedValue({ backupCodes: ['a', 'b'] });
    const request = { user: { id: 'u1' } } as RequestWithAccess;

    await controller.enrollConfirm(request, { method: 'TOTP', code: '123456' } as any);

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: '2FA_ENABLED', userId: 'u1' }),
    );
  });

  it('AC: forced enrollment (no prior session) still emits 2FA_ENABLED, using the userId from the resulting login', async () => {
    const { controller, twoFactorService, activityBus } = buildController();
    (twoFactorService.enrollConfirm as jest.Mock).mockResolvedValue({
      backupCodes: ['a'],
      login: { accessToken: 'tok', user: { id: 'u2' } },
    });
    const request = {} as RequestWithAccess; // no request.user — forced-enrollment flow

    await controller.enrollConfirm(request, { method: 'TOTP', code: '123456' } as any);

    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: '2FA_ENABLED', userId: 'u2' }),
    );
  });

  it('AC: disabling 2FA emits exactly one 2FA_DISABLED event', async () => {
    const { controller, activityBus } = buildController();
    const request = { user: { id: 'u1' } } as RequestWithAccess;

    await controller.disableTwoFactor(request, { password: 'x', code: '123456' } as any);

    expect(activityBus.record).toHaveBeenCalledTimes(1);
    expect(activityBus.record).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'AUTH', action: '2FA_DISABLED', userId: 'u1' }),
    );
  });
});

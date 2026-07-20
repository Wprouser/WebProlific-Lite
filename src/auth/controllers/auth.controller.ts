import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { Public } from '../guards/public.decorator';
import { PerUserThrottlerGuard } from '../guards/per-user-throttler.guard';
import { LoginDto } from '../dto/login.dto';
import { VerifyTwoFactorDto } from '../dto/verify-two-factor.dto';
import { ResendTwoFactorDto } from '../dto/resend-two-factor.dto';
import { EnrollStartDto } from '../dto/enroll-start.dto';
import { EnrollConfirmDto } from '../dto/enroll-confirm.dto';
import { DisableTwoFactorDto } from '../dto/disable-two-factor.dto';
import { BackupCodeLoginDto } from '../dto/backup-code-login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SetTwoFactorPolicyDto } from '../dto/set-two-factor-policy.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Roles } from '../../rbac/decorators/roles.decorator';
import { ResourceScope } from '../../rbac/decorators/resource-scope.decorator';
import { AuditLogService } from '../../rbac/services/audit-log.service';

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Public()
  @UseGuards(PerUserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MIN_MS } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(PerUserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MIN_MS } })
  @HttpCode(200)
  @Post('2fa/verify')
  verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.authService.verifyTwoFactor(dto);
  }

  @Public()
  @UseGuards(PerUserThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: FIFTEEN_MIN_MS } })
  @HttpCode(200)
  @Post('2fa/resend')
  resendTwoFactor(@Body() dto: ResendTwoFactorDto) {
    return this.authService.resendTwoFactor(dto);
  }

  @Public()
  @UseGuards(PerUserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MIN_MS } })
  @HttpCode(200)
  @Post('2fa/backup-code')
  loginWithBackupCode(@Body() dto: BackupCodeLoginDto) {
    return this.authService.loginWithBackupCode(dto);
  }

  // @Public() because the forced-enrollment flow (spec: CHAIN_OWNER policy
  // enforcement) has no access token yet — see TwoFactorService's
  // resolveEnrollingUserId. Voluntary enrollment still requires a valid
  // Bearer token; JwtAuthGuard parses one opportunistically even on public
  // routes, so request.user is populated when present.
  @Public()
  @Post('2fa/enroll/start')
  @HttpCode(200)
  enrollStart(@Req() request: RequestWithAccess, @Body() dto: EnrollStartDto) {
    return this.twoFactorService.enrollStart(request, dto);
  }

  @Public()
  @Post('2fa/enroll/confirm')
  @HttpCode(200)
  enrollConfirm(@Req() request: RequestWithAccess, @Body() dto: EnrollConfirmDto) {
    return this.twoFactorService.enrollConfirm(request, dto);
  }

  @Post('2fa/backup-codes/regenerate')
  @HttpCode(200)
  regenerateBackupCodes(@Req() request: RequestWithAccess) {
    return this.twoFactorService.regenerateBackupCodes(request.user!.id);
  }

  @Post('2fa/disable')
  @HttpCode(200)
  async disableTwoFactor(@Req() request: RequestWithAccess, @Body() dto: DisableTwoFactorDto) {
    await this.twoFactorService.disable(request.user!.id, dto);
    return { success: true };
  }

  @Patch('2fa/policy')
  @Roles('CHAIN_OWNER')
  @ResourceScope('chain', 'body.chainId')
  async setPolicy(@Req() request: RequestWithAccess, @Body() dto: SetTwoFactorPolicyDto) {
    const result = await this.twoFactorService.setPolicy(dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'SET_TWO_FACTOR_POLICY',
      entityType: 'Chain',
      entityId: dto.chainId,
      after: { enforcedByPolicy: dto.enforcedByPolicy, affectedUsers: result.affectedUsers },
    });
    return result;
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto);
    return { success: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@Req() request: RequestWithAccess) {
    await this.authService.logoutAll(request.user!.id);
    return { success: true };
  }

  @Public()
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  me(@Req() request: RequestWithAccess) {
    return this.authService.getProfile(request.user!.id);
  }
}

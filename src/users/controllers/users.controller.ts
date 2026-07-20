import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { InviteUserDto } from '../dto/invite-user.dto';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { UpdateAccessDto } from '../dto/update-access.dto';
import { AdminReauthDto } from '../dto/admin-reauth.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Roles } from '../../rbac/decorators/roles.decorator';
import { Public } from '../../auth/guards/public.decorator';

/**
 * All routes here get the same coarse `@Roles('CHAIN_OWNER','PROPERTY_MANAGER')`
 * gate (matches the spec's endpoint-table role restriction) — there's no
 * single route-param `@ResourceScope()` can hang authorization off, since
 * the relevant scope is either a dynamic `grants[]` array (invite/access
 * update) or the target user's own existing grants (everything else). Fine-
 * grained checks happen in UsersService (assertCallerCanGrant /
 * assertCallerCanManageTarget) — see FR-11/FR-14 implementation plan.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  list(@Req() request: RequestWithAccess) {
    return this.usersService.listUsers(request);
  }

  @Post('invite')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @HttpCode(200)
  invite(@Req() request: RequestWithAccess, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(request, dto);
  }

  @Public()
  @Post('invite/:token/accept')
  @HttpCode(200)
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(token, dto);
  }

  @Post(':id/invite/resend')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @HttpCode(200)
  resendInvite(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.usersService.resendInvite(request, id);
  }

  @Get(':id')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  detail(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.usersService.getUserDetail(request, id);
  }

  @Patch(':id/access')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @HttpCode(200)
  async updateAccess(
    @Req() request: RequestWithAccess,
    @Param('id') id: string,
    @Body() dto: UpdateAccessDto,
  ) {
    await this.usersService.updateAccess(request, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  async deactivate(@Req() request: RequestWithAccess, @Param('id') id: string) {
    await this.usersService.deactivate(request, id);
    return { success: true };
  }

  @Post(':id/reset-password-admin')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @HttpCode(200)
  async resetPasswordAdmin(
    @Req() request: RequestWithAccess,
    @Param('id') id: string,
    @Body() dto: AdminReauthDto,
  ) {
    await this.usersService.adminResetPassword(request, id, dto);
    return { success: true };
  }

  @Post(':id/reset-2fa-admin')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @HttpCode(200)
  async reset2faAdmin(
    @Req() request: RequestWithAccess,
    @Param('id') id: string,
    @Body() dto: AdminReauthDto,
  ) {
    await this.usersService.adminReset2fa(request, id, dto);
    return { success: true };
  }

  @Get(':id/audit-log')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  auditLog(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.usersService.getAuditLog(request, id);
  }
}

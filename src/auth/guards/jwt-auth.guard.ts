import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../services/token.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Registered globally (see AppModule) BEFORE ScopeResolutionGuard, which
 * expects `request.user.id` to already be populated — see that guard's own
 * comment (src/tenancy/guards/scope-resolution.guard.ts), written back when
 * FR-13 didn't exist yet.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      if (isPublic) return true;
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = this.tokenService.verifyAccessToken(authHeader.slice('Bearer '.length));
      request.user = { id: payload.sub };
      return true;
    } catch {
      // Public routes tolerate a missing/expired token (e.g. the forced-2FA-
      // enrollment flow, which authenticates via pendingEnrollmentToken
      // instead) — but a token that IS present and invalid should still fail
      // loudly on protected routes.
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

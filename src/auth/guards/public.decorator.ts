import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Exempts a route from JwtAuthGuard — used for login/refresh/2fa-verify/etc.,
 * which by definition run before the caller has an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

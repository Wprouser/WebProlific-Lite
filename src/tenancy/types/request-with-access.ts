import { Request } from 'express';
import { EffectiveAccess } from '../services/scope-resolution.service';

/**
 * `user` is expected to be populated upstream by an authentication guard
 * (FR-13, not yet built). Until then it will simply be undefined and
 * ScopeResolutionGuard resolves nothing — see that guard's comment.
 */
export interface RequestWithAccess extends Request {
  user?: { id: string };
  effectiveOutletIds?: string[];
  effectiveRole?: EffectiveAccess['effectiveRole'];
  effectiveAccess?: EffectiveAccess;
}

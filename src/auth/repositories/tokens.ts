// Injection tokens for repository interfaces — interfaces don't exist at
// runtime, so NestJS needs a token to bind the Prisma implementation to.
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const TWO_FACTOR_AUTH_REPOSITORY = Symbol('TWO_FACTOR_AUTH_REPOSITORY');
export const TWO_FACTOR_BACKUP_CODE_REPOSITORY = Symbol('TWO_FACTOR_BACKUP_CODE_REPOSITORY');
export const TWO_FACTOR_CHALLENGE_REPOSITORY = Symbol('TWO_FACTOR_CHALLENGE_REPOSITORY');
export const TRUSTED_DEVICE_REPOSITORY = Symbol('TRUSTED_DEVICE_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

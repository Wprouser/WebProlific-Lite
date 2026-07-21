// Injection tokens for repository interfaces — interfaces don't exist at
// runtime, so NestJS needs a token to bind the Prisma implementation to.
export const ACTIVITY_LOG_REPOSITORY = Symbol('ACTIVITY_LOG_REPOSITORY');
export const TRANSACTION_LOG_REPOSITORY = Symbol('TRANSACTION_LOG_REPOSITORY');

// Injection tokens for repository interfaces — interfaces don't exist at
// runtime, so NestJS needs a token to bind the Prisma implementation to.
export const STOCK_TRANSACTION_REPOSITORY = Symbol('STOCK_TRANSACTION_REPOSITORY');

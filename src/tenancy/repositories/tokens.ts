// Injection tokens for repository interfaces — interfaces don't exist at
// runtime, so NestJS needs a token to bind the Prisma implementation to.
export const CHAIN_REPOSITORY = Symbol('CHAIN_REPOSITORY');
export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');
export const OUTLET_REPOSITORY = Symbol('OUTLET_REPOSITORY');
export const USER_ACCESS_REPOSITORY = Symbol('USER_ACCESS_REPOSITORY');

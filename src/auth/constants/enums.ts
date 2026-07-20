// Application-layer stand-in for the TwoFactorMethod enum the Technical Spec
// defines, since Prisma's SQL Server connector rejects the `enum` schema
// construct outright (see prisma/schema.prisma header note) — same pattern as
// src/tenancy/constants/enums.ts.

export const TWO_FACTOR_METHODS = ['TOTP', 'SMS', 'EMAIL'] as const;
export type TwoFactorMethod = (typeof TWO_FACTOR_METHODS)[number];

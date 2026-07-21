// Application-layer stand-in for FR-01's Unit enum — Prisma's SQL Server
// connector rejects the `enum` schema construct outright (see
// prisma/schema.prisma header note), so this is the single source of
// truth for allowed values, same pattern as tenancy/constants/enums.ts.
export const UNITS = ['KG', 'LITRE', 'PIECE', 'BOX', 'GRAM', 'ML'] as const;
export type Unit = (typeof UNITS)[number];

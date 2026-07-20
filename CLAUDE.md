# Project: WebProlific-Lite — AI Inventory Management System

An AI-powered inventory management system for small hotels and restaurants, built to scale
from a single standalone restaurant up to a multi-property hospitality chain.

## Reference documents (read before implementing anything)
- `docs/SDLC_Document_AI_Inventory_App.md` — business requirements, scope, AI feature roadmap,
  non-functional requirements, phased rollout plan.
- `docs/Technical_Spec_Core_Inventory_Module.md` — the authoritative implementation spec:
  data models (Prisma schema), REST API contracts, validation rules, business logic, and
  acceptance criteria for every functional requirement (FR-00 through FR-18).

**Always consult the Technical Spec before implementing any FR.** It is the source of truth
for schema, endpoints, and business rules. Do not deviate from it without flagging the
deviation and explaining why first.

## Stack
- Backend: Node.js (NestJS) + TypeScript
- Database: SQL Server via Prisma ORM, accessed only through the Repository Pattern
  (see Technical Spec's "SQL Server schema compatibility notes" near the top, and SDLC doc
  §6.2) — this keeps the DB swappable to PostgreSQL or another RDBMS later without an
  application rewrite. Note: Prisma's SQL Server connector has no native `Json` type and no
  scalar array columns — see the compatibility notes before modeling any new field that
  would naturally be JSON or a list (model it as a related table or a serialized `String`
  instead, matching the pattern already used for `TwoFactorBackupCode` and `ActivityLog.metadata`).
- Frontend web: React + Tailwind CSS (PWA-enabled, doubles as the desktop experience)
- Mobile: React Native
- i18n: i18next / react-i18next / react-native-localize (multilingual, RTL-aware — see FR-15)

## Build order — follow this exactly
Per the "Suggested Build Order for a Coding Agent" section at the end of the Technical Spec:
1. FR-00 — Multi-Tenant Hierarchy (Chain → Property → Outlet) + UserAccess scope resolution
2. FR-13 — Auth & Login incl. Two-Factor Authentication
3. FR-11 — RBAC + FR-14 — User Management
4. FR-17 — Design System foundation (tokens + core component library, before any feature screen)
5. FR-15 — Localization scaffolding (i18n + Language registry, EN/AR at launch, RTL-generic)
6. FR-18 — Activity & Transaction Log plumbing (event bus, so every later module logs automatically)
7. FR-01 — Item Master
8. FR-02 — Stock Transactions (the core engine everything else writes through)
9. FR-16 + tax portion of FR-04 — Currency & Tax reference data
10. FR-03 — Suppliers → FR-04 — Purchase Orders & GRN
11. FR-05 — Recipes/BOM → FR-06 — POS Auto-Deduction
12. FR-07 — Alerts
13. FR-08 — Multi-outlet/Multi-property Transfers
14. FR-09 — Barcode Scanning
15. FR-10 — Reporting
16. FR-12 — Offline Sync

**Do not start a later FR until the acceptance criteria of its dependencies are met.**

## Working conventions
- Every FR's acceptance criteria checklist (in the Technical Spec) must pass before that FR
  is considered done. Treat these as the definition of done, not a nice-to-have.
- Write tests alongside each module as it's built, not retrofitted afterward.
- Use the Repository Pattern for all data access — no direct Prisma/ORM calls from services
  (see SDLC doc §6.2 for the rationale — this is what keeps the DB portable).
- Every mutating endpoint must emit an ActivityLog entry (FR-18) and, where it carries a
  monetary/stock value, a TransactionLog entry — via the shared event mechanism, not
  hand-added logging calls per service.
- Role checks go through the RBAC guard (FR-11) resolved against `effectiveOutletIds`
  (FR-00) — never ad-hoc `if (user.role === ...)` checks scattered in services.
- All amounts: `Decimal(12,2)`. All quantities: `Decimal(10,3)`.
- Follow FR-17's design-token approach for every screen — no hardcoded colors/spacing.

## Before writing code on any new FR
Read the relevant FR section in the Technical Spec in full, then give a short implementation
plan (files to create/modify, order of operations) before writing code, so it can be checked
against the spec first.

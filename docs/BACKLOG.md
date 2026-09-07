# Backlog

Known gaps that are real but deliberately not being fixed right now, with enough
context to pick each one up cold. Add to this rather than losing a finding in a
conversation.

---

## `update()` doesn't check for a duplicate name on rename (Category, Unit of Measure)

**Logged:** 2026-09-07, while bringing Category to isActive/deactivation parity
with Unit of Measure.
**Status:** open — deliberately deferred, not a regression.

**What happens today.** Both `Category` and `UnitOfMeasure` enforce a
`@@unique([name, outletId])` constraint at the database level, and both
services' `create()` methods check for a duplicate name up front and return a
clean `409 ConflictException`. Neither service's `update()` does the same
check before renaming — `CategoriesService.update()` and `UnitsService.update()`
both pass a new `name` straight through to the repository. Renaming to a name
that collides with another row in the same outlet will hit the raw Prisma
unique-constraint violation and surface as a generic `500`, not a clean `409`.

**Why it matters.** Low-severity — an edge case (deliberately renaming to a name
that already exists), not something that happens by accident — but a confusing
error message when it does happen.

**Why not fixed now.** Found while explicitly keeping `CategoriesService.update()`
at strict behavioral parity with `UnitsService.update()` (per explicit
instruction, to avoid the two "identical" patterns silently diverging). Since
the gap already exists in the established Unit of Measure pattern being mirrored,
fixing it only in Category would be inconsistent; fixing both is a separate,
tiny, unrelated change.

**Scope when picked up:** add the same up-front `findByNameAndOutlet` check
(mirroring each service's own `create()`) to both `CategoriesService.update()`
and `UnitsService.update()`, throwing `ConflictException` when the match isn't
the row being updated. Trivial, a few lines per service plus two tests.

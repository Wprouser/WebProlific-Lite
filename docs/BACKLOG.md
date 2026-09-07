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

---

## Deactivating a supplier never actually checks for open purchase orders

**Logged:** 2026-09-07, while fixing the identical gap on `Item` (see git
history — `ItemsService.assertNoOpenPurchaseOrders` was just fixed).
**Status:** open — a stale stub, the exact twin of the Item gap just closed.

**What the spec says.** FR-03's Business Logic: `DELETE /suppliers/:id` ->
`409` if any `PurchaseOrder.status NOT IN [Closed, Cancelled, Rejected]`
references it.

**What the code actually does.** `SuppliersService.softDelete()` calls
`this.assertNoOpenPurchaseOrders(id)`, whose body is just `return;` — a
no-op, with a comment explicitly noting it mirrors
`ItemsService.assertNoOpenPurchaseOrders` "same pattern." That Item version
has now been fixed for real; this Supplier one was deliberately left alone
since only the Item gap was asked for.

**Why it matters.** Same as the Item version: silently violates a documented
acceptance criterion — a supplier still on an open PO can be deactivated
with no warning today.

**Why not fixed now.** Found while fixing the identical Item gap, but it's a
distinct file/service and wasn't part of what was asked — fixing it is a
separate, small, deliberate change.

**Scope when picked up:** same shape as the Item fix — resolve
`PURCHASE_ORDER_REPOSITORY` inside `SuppliersService` (note: a plain
constructor `@Inject` may hit the same multi-hop module cycle the Item fix
did — `PurchaseOrdersModule` already imports `SuppliersModule` directly, so
check whether `ModuleRef.get(..., {strict: false})` is needed here too
rather than assuming a normal import will work), add a
`hasOpenPurchaseOrderForItem`-style method scoped by `supplierId` instead
(a direct field on `PurchaseOrder`, no join needed — simpler than the Item
version), and mirror the e2e test added for Item's fix.

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

## Deactivating an item never actually checks for open purchase orders

**Logged:** 2026-09-07, while adding FR-01's bulk item import.
**Status:** open — a stale stub, not a new gap.

**What the spec says.** FR-01's Business Logic: on `DELETE /items/:id`
(deactivate), check for any `PurchaseOrder` with status not in
`[Closed, Cancelled, Rejected]` referencing this item, and return `409` if
found — "Cannot deactivate item with open purchase orders."

**What the code actually does.** `ItemsService.softDelete()` calls
`this.assertNoOpenPurchaseOrders(id)`, but that method's body is just
`return;` — a no-op, with a comment explaining it was stubbed out because
"PurchaseOrder doesn't exist yet — FR-04 isn't built." FR-04 (and GRN) are
now fully built, so this stub is stale: an item with genuinely open POs can
be deactivated today with no warning.

**Why it matters.** Low-to-medium — deactivating an item that's still on an
open PO doesn't corrupt anything immediately (the PO/GRN keep working off
their own snapshotted line data), but it silently violates a documented
acceptance criterion and hides a real business-process footgun (receiving
against a PO for an item nobody can find in the active list anymore).

**Why not fixed now.** Found incidentally while working on bulk import, a
different and unrelated FR-01 feature — fixing it wasn't part of what was
asked, and it deserves its own small, deliberate change and test rather than
being folded into something else.

**Scope when picked up:** inject `PURCHASE_ORDER_REPOSITORY` into
`ItemsService` (same one-directional-import pattern `GrnModule`/
`SuppliersModule` already use) and implement the real check — likely a new
`PurchaseOrderRepository` method to find POs by `itemId` and status, since
none exists yet. Add an e2e test mirroring the existing "AC: deactivating an
item with an open PO returns 409" style used elsewhere in this codebase.

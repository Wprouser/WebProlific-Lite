# Backlog

Known gaps that are real but deliberately not being fixed right now, with enough
context to pick each one up cold. Add to this rather than losing a finding in a
conversation.

---

## GRN does not implement its own spec's "Post Received Items" step

**Logged:** 2026-08-05, while planning FR-06.
**Status:** in progress — being picked up now (2026-09-07 backlog-clearing pass, item 2 of 3), reusing FR-06's preview pattern as planned below.

**What the spec says.** FR-04 describes GRN receiving as a two-stage action: the
user reviews received lines, sees an **"Inventory Impact preview"** showing what
the receipt will do to stock, and then explicitly commits via **"Post Received
Items"**. FR-06's batch-import Review screen is written as *"mirroring the
'Inventory Impact preview' pattern already established for GRN's 'Post Received
Items'"* — i.e. the spec treats that pattern as existing.

**What the code actually does.** It doesn't exist. There is no draft/posted
distinction on a GRN, no impact preview, and no separate commit step: creating a
GRN writes `StockTransaction` rows immediately. The only thing called a
"preview" in the GRN screens is `previewLineTax` in
`web/src/components/grn/GrnLineItemsEditor.tsx` — a client-side per-line
*tax/total* calculation, unrelated to stock impact.

**Why it matters.** Receiving goods is an irreversible stock movement, and it is
currently committed without the user being shown its inventory consequences
first. That is the same class of risk FR-06's "Run BOM" confirmation is designed
to avoid, and it applies at least as strongly to GRN.

**The plan.** FR-06 builds the server-side impact-preview pattern properly —
projected stock impact has to be computed server-side because it requires full
recursive recipe-tree resolution, which the client cannot do. Once that pattern
is established and proven in FR-06, bring GRN in line with it as its own
follow-up: an explicit preview + "Post Received Items" commit step, reusing the
FR-06 preview shape rather than inventing a second one.

**Scope when picked up:** likely a `status` field on `Grn` (draft vs. posted), a
`GET /grn/:id/impact-preview` endpoint, a commit endpoint, and the corresponding
two-stage UI on the GRN screens. Check FR-04's acceptance criteria for what the
spec actually demands before designing.

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

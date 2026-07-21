// FR-07 names this exact event ("publish an event (item.stock.changed) to
// a queue ... consumed by an AlertsProcessor"). FR-07 doesn't exist yet
// (build order step 12) — this is emitted now with no listener, so FR-07
// only needs to add an @OnEvent(ITEM_STOCK_CHANGED_EVENT) handler later,
// zero changes here.
export const ITEM_STOCK_CHANGED_EVENT = 'item.stock.changed';

export interface ItemStockChangedEvent {
  itemId: string;
  outletId: string;
  currentStock: string;
  minStock: string;
}

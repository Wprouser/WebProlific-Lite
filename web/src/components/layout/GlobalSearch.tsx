import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { mockSearchIndex, type SearchEntityType, type SearchResultFixture } from '@/lib/fixtures';

/** Compact, auto-width at every breakpoint (icon-only on phone, +label from
 * `tablet:`, +kbd hint from `lg:`) — a fixed-width input-lookalike box was
 * eating too much of the header's limited horizontal budget. */
export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Search"
      className="flex h-12 shrink-0 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="hidden tablet:inline">Search</span>
      <kbd className="hidden shrink-0 rounded border border-border-strong bg-surface-secondary px-1.5 py-0.5 text-xs lg:inline">
        Ctrl K
      </kbd>
    </button>
  );
}

export interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FR-17 Global App Chrome: "a single search box with type-ahead, results
 * grouped by entity type, scoped automatically to the user's
 * effectiveOutletIds." Scoping is a real FR-00-dependent concern for
 * whichever backend eventually serves this — this is the client
 * mechanism (grouping, keyboard access, navigation) proven against
 * fixtures.mockSearchIndex.
 */
export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Map<SearchEntityType, SearchResultFixture[]>();
    const matches = mockSearchIndex.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q),
    );
    const map = new Map<SearchEntityType, SearchResultFixture[]>();
    for (const r of matches) {
      map.set(r.type, [...(map.get(r.type) ?? []), r]);
    }
    return map;
  }, [query]);

  const hasQuery = query.trim() !== '';
  const hasResults = grouped.size > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out"
        >
          <Dialog.Title className="sr-only">Global search</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search items, categories, suppliers, purchase orders, GRNs, transfers, recipes, and users.
          </Dialog.Description>
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search className="h-5 w-5 shrink-0 text-foreground-muted" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- command palette input, expected UX */}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items, categories, suppliers, POs, GRNs, transfers, recipes, users…"
              className="w-full bg-transparent text-base text-foreground placeholder:text-foreground-muted focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-border-strong bg-surface-secondary px-1.5 py-0.5 text-xs text-foreground-muted sm:inline">
              Esc
            </kbd>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {!hasQuery && (
              <p className="px-3 py-10 text-center text-sm text-foreground-muted">
                Search across items, suppliers, purchase orders, and more.
              </p>
            )}
            {hasQuery && !hasResults && (
              <p className="px-3 py-10 text-center text-sm text-foreground-muted">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
            {[...grouped.entries()].map(([type, items]) => (
              <div key={type} className="mb-2">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {type}
                </p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onOpenChange(false)}
                    className="flex w-full flex-col items-start rounded-md px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-secondary"
                  >
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-foreground-muted">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

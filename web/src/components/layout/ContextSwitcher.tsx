import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mockChain } from '@/lib/fixtures';
import { cn } from '@/lib/cn';

/**
 * FR-17 Global App Chrome: "The Chain/Property/Outlet breadcrumb *is* the
 * FR-00 context switcher — tapping any segment opens the switcher for that
 * level (only shown if the user has access to more than one entity at
 * that level; a single-outlet user just sees plain text, not a dead-end
 * dropdown)." Each segment is independently interactive or not, based on
 * how many options exist at that level for the current selection.
 *
 * Two layouts share the same state: the full 3-segment breadcrumb from
 * `tablet:`+, and — below that — a single compact "[Outlet] ▾" trigger
 * instead. Three truncated segments in ~150px of phone width was
 * technically non-overflowing but functionally illegible ("Al... › R... ›
 * M.."); showing just the level that actually matters moment-to-moment,
 * with the full hierarchy one tap away, is the more legible mobile
 * pattern for a chef/store-clerk glancing at this mid-task.
 *
 * Client-side state only (per FR-00: a user's effective access can span
 * many outlets simultaneously, this doesn't call the server). Runs
 * against mock fixture data — see fixtures.ts.
 */
export function ContextSwitcher() {
  const { t } = useTranslation();
  const [selectedPropertyId, setSelectedPropertyId] = useState(mockChain.properties[0]!.id);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(
    mockChain.properties[0]!.outlets[0]?.id,
  );

  const property = mockChain.properties.find((p) => p.id === selectedPropertyId)!;
  const outlet = property.outlets.find((o) => o.id === selectedOutletId);

  function selectProperty(propertyId: string) {
    const next = mockChain.properties.find((p) => p.id === propertyId)!;
    setSelectedPropertyId(propertyId);
    setSelectedOutletId(next.outlets[0]?.id);
  }

  const hasMultipleProperties = mockChain.properties.length > 1;
  const hasMultipleOutlets = property.outlets.length > 1;
  const canSwitchAnything = hasMultipleProperties || mockChain.properties.some((p) => p.outlets.length > 1);

  return (
    <>
      {/* tablet:+ — full breadcrumb */}
      <nav
        aria-label={t('contextSwitcher.ariaLabel')}
        className="hidden min-w-0 items-center gap-1 text-sm tablet:flex"
      >
        <span className="truncate font-medium text-foreground">{mockChain.name}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />

        {hasMultipleProperties ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="truncate rounded-md px-1.5 py-1 font-medium text-foreground transition-colors duration-150 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {property.name}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={10}
                className="z-50 w-64 rounded-lg border border-border bg-surface p-2 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
              >
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {t('contextSwitcher.switchProperty')}
                </p>
                {mockChain.properties.map((p) => (
                  <Popover.Close asChild key={p.id}>
                    <button
                      onClick={() => selectProperty(p.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-secondary',
                        p.id === selectedPropertyId && 'bg-primary/10 text-primary',
                      )}
                    >
                      {p.name}
                      {p.id === selectedPropertyId && <Check className="h-4 w-4" />}
                    </button>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <span className="truncate font-medium text-foreground">{property.name}</span>
        )}

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />

        {hasMultipleOutlets ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="truncate rounded-md px-1.5 py-1 font-medium text-foreground transition-colors duration-150 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {outlet?.name ?? property.outlets[0]?.name}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={10}
                className="z-50 w-64 rounded-lg border border-border bg-surface p-2 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
              >
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {t('contextSwitcher.switchOutlet')}
                </p>
                {property.outlets.map((o) => (
                  <Popover.Close asChild key={o.id}>
                    <button
                      onClick={() => setSelectedOutletId(o.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-secondary',
                        o.id === selectedOutletId && 'bg-primary/10 text-primary',
                      )}
                    >
                      {o.name}
                      {o.id === selectedOutletId && <Check className="h-4 w-4" />}
                    </button>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <span className="truncate font-medium text-foreground">{property.outlets[0]?.name}</span>
        )}
      </nav>

      {/* Below tablet: — compact "[Outlet] ▾" trigger, full hierarchy on tap */}
      <div className="min-w-0 flex-1 tablet:hidden">
        {canSwitchAnything ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="flex min-w-0 items-center gap-1 rounded-md py-1 text-left font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="truncate">{outlet?.name ?? property.name}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-foreground-muted" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={10}
                className="z-50 max-h-80 w-72 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
              >
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {mockChain.name}
                </p>
                {mockChain.properties.map((p) => (
                  <div key={p.id} className="mb-1">
                    <Popover.Close asChild>
                      <button
                        onClick={() => selectProperty(p.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-secondary',
                          p.id === selectedPropertyId && !selectedOutletId && 'bg-primary/10 text-primary',
                        )}
                      >
                        {p.name}
                        {p.id === selectedPropertyId && !selectedOutletId && <Check className="h-4 w-4" />}
                      </button>
                    </Popover.Close>
                    {p.outlets.map((o) => (
                      <Popover.Close asChild key={o.id}>
                        <button
                          onClick={() => {
                            setSelectedPropertyId(p.id);
                            setSelectedOutletId(o.id);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md py-2.5 pl-7 pr-3 text-left text-sm text-foreground-muted transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground',
                            o.id === selectedOutletId && p.id === selectedPropertyId && 'bg-primary/10 text-primary',
                          )}
                        >
                          {o.name}
                          {o.id === selectedOutletId && p.id === selectedPropertyId && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </Popover.Close>
                    ))}
                  </div>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <span className="block truncate font-medium text-foreground">
            {outlet?.name ?? property.name}
          </span>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadOrganizationTree, groupOutletsIntoTree, type TreeProperty } from '@/lib/organization-tree';
import { outletsApi } from '@/lib/outlets-api';
import { getSession } from '@/lib/auth-store';
import { cn } from '@/lib/cn';

/**
 * FR-17 Global App Chrome: "The Chain/Property/Outlet breadcrumb *is* the
 * FR-00 context switcher — tapping any segment opens the switcher for that
 * level (only shown if the user has access to more than one entity at
 * that level; a single-outlet user just sees plain text, not a dead-end
 * dropdown)." Each segment is independently interactive or not, based on
 * how many options exist at that level for the current selection.
 *
 * Real data as of FR-00's Organization-screen pass, one of three shapes
 * depending on the caller's own grants (see organization-tree.ts):
 * a CHAIN grant (CHAIN_OWNER) → the full chain hierarchy in one call; a
 * PROPERTY grant only (PROPERTY_MANAGER) → their own propert(ies), no
 * chain node (there's no endpoint that could ever resolve their chain's
 * name); an OUTLET grant only (OUTLET_MANAGER/STORE_STAFF/CHEF) → GET
 * /outlets grouped into the same shape, since that's the one endpoint
 * every role can reach regardless of scope level.
 *
 * The initial selection mirrors `effectiveOutletIds[0]` — what every other
 * screen already defaults to — so the switcher's first render agrees with
 * what the rest of the app is showing. Selecting something else here is
 * still local display state only: it does not yet re-scope other screens.
 * That wiring is the explicit next priority after this pass, not a
 * permanent limitation — see the Organization-screen implementation plan.
 */
export function ContextSwitcher() {
  const { t } = useTranslation();
  const session = getSession();

  const [loading, setLoading] = useState(true);
  const [chainName, setChainName] = useState<string | undefined>(undefined);
  const [properties, setProperties] = useState<TreeProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [selectedOutletId, setSelectedOutletId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const chainId = session?.user.effectiveChainIds[0];
        const propertyIds = session?.user.effectivePropertyIds ?? [];
        let tree = await loadOrganizationTree(chainId, propertyIds);
        if (tree.properties.length === 0 && !chainId && propertyIds.length === 0) {
          tree = groupOutletsIntoTree(await outletsApi.listAccessible());
        }
        if (cancelled) return;

        setChainName(tree.chainName);
        setProperties(tree.properties);

        const defaultOutletId = session?.user.effectiveOutletIds[0];
        const defaultProperty =
          tree.properties.find((p) => p.outlets.some((o) => o.id === defaultOutletId)) ?? tree.properties[0];
        setSelectedPropertyId(defaultProperty?.id);
        setSelectedOutletId(
          defaultProperty?.outlets.some((o) => o.id === defaultOutletId)
            ? defaultOutletId
            : defaultProperty?.outlets[0]?.id,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // effectiveChainIds/effectivePropertyIds/effectiveOutletIds only ever
    // change on a fresh login (a new session object entirely), so it's
    // enough to load once per mount rather than re-deriving a dependency
    // array from session fields that don't change within one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="h-5 w-40 animate-pulse rounded bg-surface-secondary tablet:h-5 tablet:w-64" />;
  }

  if (properties.length === 0) {
    return <span className="truncate text-sm font-medium text-foreground">{chainName ?? t('contextSwitcher.none')}</span>;
  }

  const property = properties.find((p) => p.id === selectedPropertyId) ?? properties[0]!;
  const outlet = property.outlets.find((o) => o.id === selectedOutletId);

  function selectProperty(propertyId: string) {
    const next = properties.find((p) => p.id === propertyId)!;
    setSelectedPropertyId(propertyId);
    setSelectedOutletId(next.outlets[0]?.id);
  }

  const hasMultipleProperties = properties.length > 1;
  const hasMultipleOutlets = property.outlets.length > 1;
  const canSwitchAnything = hasMultipleProperties || properties.some((p) => p.outlets.length > 1);

  return (
    <>
      {/* tablet:+ — full breadcrumb */}
      <nav
        aria-label={t('contextSwitcher.ariaLabel')}
        className="hidden min-w-0 items-center gap-1 text-sm tablet:flex"
      >
        {chainName && (
          <>
            <span className="truncate font-medium text-foreground">{chainName}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
          </>
        )}

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
                {properties.map((p) => (
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
                {chainName && (
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    {chainName}
                  </p>
                )}
                {properties.map((p) => (
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

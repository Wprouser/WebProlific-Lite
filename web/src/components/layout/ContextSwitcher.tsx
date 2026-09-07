import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Building2, Check, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadOrganizationTree, groupOutletsIntoTree, type TreeProperty } from '@/lib/organization-tree';
import { outletsApi } from '@/lib/outlets-api';
import { getSession } from '@/lib/auth-store';
import { getSelectedContext, setSelectedContext, useSelectedContext, type SelectedContext } from '@/lib/selected-context-store';
import { confirmDiscardIfNeeded } from '@/lib/unsaved-work-registry';
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
 * depending on the caller's own grants (see organization-tree.ts): a CHAIN
 * grant → the full hierarchy in one call; a PROPERTY grant only → their
 * own propert(ies), no chain node; an OUTLET grant only → GET /outlets
 * grouped into the same shape.
 *
 * The selection this component writes is the app-wide "what am I looking
 * at" — every outlet-scoped screen now reads it via useSelectedContext()
 * instead of independently defaulting to effectiveOutletIds[0]. Changing
 * it goes through confirmDiscardIfNeeded first, so it can't silently wipe
 * out a half-filled full-page form elsewhere in the app.
 */
export function ContextSwitcher() {
  const { t } = useTranslation();
  const session = getSession();
  const role = session?.user.effectiveRole ?? '';
  const canViewEntireProperty = role === 'CHAIN_OWNER' || role === 'PROPERTY_MANAGER';

  const [loading, setLoading] = useState(true);
  const [chainName, setChainName] = useState<string | undefined>(undefined);
  const [properties, setProperties] = useState<TreeProperty[]>([]);
  const context = useSelectedContext();

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
        establishOrRepairSelection(tree.properties, session?.user.effectiveOutletIds[0]);
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

  /** Persists a default (first load) or repairs a stale one (the stored
   * outlet/property no longer exists, e.g. deactivated or access revoked)
   * against a freshly loaded tree — every other screen reads whatever
   * this settles on via useSelectedContext(). */
  function establishOrRepairSelection(loadedProperties: TreeProperty[], defaultOutletId: string | undefined) {
    const stored = getSelectedContext();
    const storedProperty = stored ? loadedProperties.find((p) => p.id === stored.propertyId) : undefined;
    const storedStillValid = !!storedProperty && storedProperty.outlets.some((o) => o.id === stored!.outletId);
    if (storedStillValid) return;

    const defaultProperty =
      loadedProperties.find((p) => p.outlets.some((o) => o.id === defaultOutletId)) ?? loadedProperties[0];
    if (!defaultProperty) return;
    const resolvedOutletId = defaultProperty.outlets.some((o) => o.id === defaultOutletId)
      ? defaultOutletId!
      : (defaultProperty.outlets[0]?.id ?? '');
    setSelectedContext({ level: 'outlet', outletId: resolvedOutletId, propertyId: defaultProperty.id });
  }

  function applySelection(next: SelectedContext) {
    const current = getSelectedContext();
    if (current && current.level === next.level && current.outletId === next.outletId && current.propertyId === next.propertyId) {
      return;
    }
    if (!confirmDiscardIfNeeded((label) => t('unsavedWork.confirmDiscard', { label }))) return;
    setSelectedContext(next);
  }

  function selectProperty(propertyId: string) {
    const next = properties.find((p) => p.id === propertyId)!;
    applySelection({ level: 'outlet', outletId: next.outlets[0]?.id ?? '', propertyId: next.id });
  }

  function selectOutlet(propertyId: string, outletId: string) {
    applySelection({ level: 'outlet', outletId, propertyId });
  }

  function selectEntireProperty(property: TreeProperty) {
    applySelection({ level: 'property', outletId: property.outlets[0]?.id ?? '', propertyId: property.id });
  }

  if (loading) {
    return <div className="h-5 w-40 animate-pulse rounded bg-surface-secondary tablet:h-5 tablet:w-64" />;
  }

  if (properties.length === 0) {
    return <span className="truncate text-sm font-medium text-foreground">{chainName ?? t('contextSwitcher.none')}</span>;
  }

  const property = properties.find((p) => p.id === context.propertyId) ?? properties[0]!;
  const outlet = property.outlets.find((o) => o.id === context.outletId);
  const outletDisplayName = context.level === 'property' ? t('contextSwitcher.allOutlets') : (outlet?.name ?? property.outlets[0]?.name);

  const hasMultipleProperties = properties.length > 1;
  const hasMultipleOutlets = property.outlets.length > 1;
  const showEntirePropertyOption = canViewEntireProperty && hasMultipleOutlets;
  const canSwitchAnything = hasMultipleProperties || properties.some((p) => p.outlets.length > 1) || showEntirePropertyOption;

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
                        p.id === property.id && 'bg-primary/10 text-primary',
                      )}
                    >
                      {p.name}
                      {p.id === property.id && <Check className="h-4 w-4" />}
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

        {hasMultipleOutlets || showEntirePropertyOption ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="truncate rounded-md px-1.5 py-1 font-medium text-foreground transition-colors duration-150 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {outletDisplayName}
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
                {showEntirePropertyOption && (
                  <Popover.Close asChild>
                    <button
                      onClick={() => selectEntireProperty(property)}
                      className={cn(
                        'mb-1 flex w-full items-center justify-between gap-2 rounded-md border-b border-border px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-secondary',
                        context.level === 'property' && 'bg-primary/10 text-primary',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {t('contextSwitcher.viewEntireProperty')}
                      </span>
                      {context.level === 'property' && <Check className="h-4 w-4" />}
                    </button>
                  </Popover.Close>
                )}
                {property.outlets.map((o) => (
                  <Popover.Close asChild key={o.id}>
                    <button
                      onClick={() => selectOutlet(property.id, o.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-secondary',
                        context.level === 'outlet' && o.id === context.outletId && 'bg-primary/10 text-primary',
                      )}
                    >
                      {o.name}
                      {context.level === 'outlet' && o.id === context.outletId && <Check className="h-4 w-4" />}
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
                <span className="truncate">{outletDisplayName}</span>
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
                          p.id === property.id && context.level === 'outlet' && !property.outlets.some((o) => o.id === context.outletId) && 'bg-primary/10 text-primary',
                        )}
                      >
                        {p.name}
                      </button>
                    </Popover.Close>
                    {canViewEntireProperty && p.outlets.length > 1 && (
                      <Popover.Close asChild>
                        <button
                          onClick={() => selectEntireProperty(p)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md py-2.5 pl-7 pr-3 text-left text-sm text-foreground-muted transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground',
                            p.id === property.id && context.level === 'property' && 'bg-primary/10 text-primary',
                          )}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {t('contextSwitcher.viewEntireProperty')}
                          {p.id === property.id && context.level === 'property' && <Check className="ms-auto h-4 w-4" />}
                        </button>
                      </Popover.Close>
                    )}
                    {p.outlets.map((o) => (
                      <Popover.Close asChild key={o.id}>
                        <button
                          onClick={() => selectOutlet(p.id, o.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md py-2.5 pl-7 pr-3 text-left text-sm text-foreground-muted transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground',
                            p.id === property.id && context.level === 'outlet' && o.id === context.outletId && 'bg-primary/10 text-primary',
                          )}
                        >
                          {o.name}
                          {p.id === property.id && context.level === 'outlet' && o.id === context.outletId && (
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
          <span className="block truncate font-medium text-foreground">{outletDisplayName}</span>
        )}
      </div>
    </>
  );
}

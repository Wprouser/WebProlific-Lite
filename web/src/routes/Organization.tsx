import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronDown, ChevronRight, Coins, Plus, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PropertyFormModal } from '@/components/organization/PropertyFormModal';
import { OutletFormModal } from '@/components/organization/OutletFormModal';
import { ChangeBaseCurrencyModal } from '@/components/currency/ChangeBaseCurrencyModal';
import { propertiesApi, type ApiPropertyWithOutlets } from '@/lib/properties-api';
import { outletsApi, type ApiOutlet, type ApiOutletCurrencySettings } from '@/lib/outlets-api';
import { currenciesApi, type ApiCurrency } from '@/lib/currencies-api';
import { loadOrganizationTree, type TreeProperty } from '@/lib/organization-tree';
import { getSession } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

type ConfirmTarget =
  | { kind: 'property'; id: string; name: string; outletCount: number }
  | { kind: 'outlet'; id: string; name: string };

/**
 * FR-00's Organization screen. Two data-loading paths, not one:
 * - A direct CHAIN grant (CHAIN_OWNER) → one GET /chains/:id/hierarchy call
 *   gets the whole tree, chain name included.
 * - No CHAIN grant but PROPERTY grants (PROPERTY_MANAGER) → GET
 *   /properties/:id per accessible property, no chain node at all — a
 *   PROPERTY_MANAGER has no endpoint that can ever resolve their own
 *   chain's name (roleForChain doesn't inherit from a PROPERTY grant).
 *
 * Reachable by anyone who navigates here directly, but naturally renders
 * empty for a role with neither kind of grant (nav hides the link for
 * everyone but CHAIN_OWNER/PROPERTY_MANAGER) — driven by the same resolved
 * access the server enforces on, not a separate ad-hoc check.
 */
export function Organization() {
  const { t } = useTranslation();
  const session = getSession();
  const role = session?.user.effectiveRole ?? '';
  const chainId = session?.user.effectiveChainIds[0];
  const propertyIds = session?.user.effectivePropertyIds ?? [];
  // A stable primitive for the effect/callback dependency array below —
  // effectivePropertyIds is a fresh array reference on every getSession()
  // call, which would otherwise re-trigger the load on every render.
  const propertyIdsKey = propertyIds.join(',');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | undefined>(undefined);
  const [chainBaseCurrency, setChainBaseCurrency] = useState<string | undefined>(undefined);
  const [properties, setProperties] = useState<TreeProperty[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);

  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<ApiPropertyWithOutlets | null>(null);

  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<ApiOutlet | null>(null);
  const [outletModalPropertyId, setOutletModalPropertyId] = useState<string | undefined>(undefined);

  const [currencyModalOutlet, setCurrencyModalOutlet] = useState<{ id: string; settings: ApiOutletCurrencySettings } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree = await loadOrganizationTree(chainId, propertyIds);
      setChainName(tree.chainName);
      setChainBaseCurrency(tree.chainBaseCurrency);
      setProperties(tree.properties);
      setCurrencies(await currenciesApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('organization.loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, propertyIdsKey, t]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleExpanded(propertyId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  function canManageProperty(propertyId: string): boolean {
    return role === 'CHAIN_OWNER' || (role === 'PROPERTY_MANAGER' && propertyIds.includes(propertyId));
  }

  function handleSaved() {
    setPropertyModalOpen(false);
    setOutletModalOpen(false);
    setCurrencyModalOutlet(null);
    load();
  }

  async function openEditProperty(propertyId: string) {
    const full = await propertiesApi.get(propertyId);
    setEditingProperty(full);
    setPropertyModalOpen(true);
  }

  async function openEditOutlet(outletId: string) {
    const full = await outletsApi.get(outletId);
    setEditingOutlet(full);
    setOutletModalOpen(true);
  }

  async function openChangeCurrency(outletId: string) {
    const settings = await outletsApi.getCurrencySettings(outletId);
    setCurrencyModalOutlet({ id: outletId, settings });
  }

  async function handleConfirmDeactivate() {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      if (confirmTarget.kind === 'property') {
        await propertiesApi.update(confirmTarget.id, { isActive: false });
      } else {
        await outletsApi.update(confirmTarget.id, { isActive: false });
      }
      setConfirmTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('organization.loadError'));
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Building2 className="h-7 w-7" />}
        title={t('organization.loadError')}
        description={error}
        action={<Button onClick={load}>{t('common.refresh')}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {t('organization.title')}
            {chainName && <span className="ms-2 font-sans text-sm font-normal text-foreground-muted">— {chainName}</span>}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">{t('organization.subtitle')}</p>
        </div>
        {role === 'CHAIN_OWNER' && chainId && (
          <Button
            onClick={() => {
              setEditingProperty(null);
              setPropertyModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('organization.addProperty')}
          </Button>
        )}
      </div>

      {confirmTarget && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-strong p-3.5">
          <span className="text-sm text-foreground-muted">
            {confirmTarget.kind === 'property'
              ? t('organization.confirmDeactivateProperty', { name: confirmTarget.name, count: confirmTarget.outletCount })
              : t('organization.confirmDeactivateOutlet', { name: confirmTarget.name })}
          </span>
          <Button variant="danger" size="sm" disabled={confirming} onClick={handleConfirmDeactivate}>
            {confirming ? t('organization.deactivating') : t('organization.confirmYes')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(null)}>
            {t('organization.confirmNo')}
          </Button>
        </div>
      )}

      {properties.length === 0 ? (
        // No separate CTA here — the header's own Add Property button
        // (CHAIN_OWNER only) already covers it; a second one would just
        // duplicate the same action.
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title={t('organization.empty.title')}
          description={t('organization.empty.description')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {properties.map((property) => {
            const isOpen = expanded.has(property.id);
            const canManage = canManageProperty(property.id);
            return (
              <Card key={property.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(property.id)}
                      className="flex items-center gap-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-foreground-muted" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-foreground-muted" />
                      )}
                      <Building2 className="h-4 w-4 text-foreground-muted" />
                      <span className="font-medium text-foreground">{property.name}</span>
                    </button>
                    <Badge variant="neutral">{t(`organization.propertyType.${property.type}`)}</Badge>
                    <Badge variant={property.isActive ? 'success-solid' : 'neutral'}>
                      {property.isActive ? t('organization.status.active') : t('organization.status.inactive')}
                    </Badge>
                    {canManage && (
                      <div className="ms-auto flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditProperty(property.id)}>
                          {t('organization.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOutletModalPropertyId(property.id);
                            setEditingOutlet(null);
                            setOutletModalOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('organization.addOutlet')}
                        </Button>
                        {property.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setConfirmTarget({
                                kind: 'property',
                                id: property.id,
                                name: property.name,
                                outletCount: property.outlets.length,
                              })
                            }
                          >
                            {t('organization.deactivate')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="ms-6 flex flex-col gap-1.5 border-s border-border ps-4">
                      {property.outlets.length === 0 ? (
                        <p className="py-1 text-sm text-foreground-muted">{t('organization.noOutlets')}</p>
                      ) : (
                        property.outlets.map((outlet) => (
                          <div
                            key={outlet.id}
                            className={cn(
                              'flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5',
                              'hover:bg-surface-secondary',
                            )}
                          >
                            <Store className="h-3.5 w-3.5 text-foreground-muted" />
                            <span className="text-sm text-foreground">{outlet.name}</span>
                            <Badge variant="neutral">{t(`organization.outletType.${outlet.type}`)}</Badge>
                            <Badge variant={outlet.isActive ? 'success-solid' : 'neutral'}>
                              {outlet.isActive ? t('organization.status.active') : t('organization.status.inactive')}
                            </Badge>
                            {canManage && (
                              <div className="ms-auto flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditOutlet(outlet.id)}>
                                  {t('organization.edit')}
                                </Button>
                                {role === 'CHAIN_OWNER' && (
                                  <Button variant="ghost" size="sm" onClick={() => openChangeCurrency(outlet.id)}>
                                    <Coins className="h-3.5 w-3.5" />
                                    {t('organization.changeCurrency')}
                                  </Button>
                                )}
                                {outlet.isActive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setConfirmTarget({ kind: 'outlet', id: outlet.id, name: outlet.name })}
                                  >
                                    {t('organization.deactivate')}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PropertyFormModal
        open={propertyModalOpen}
        onOpenChange={setPropertyModalOpen}
        property={editingProperty}
        chainId={chainId}
        onSaved={handleSaved}
      />
      <OutletFormModal
        open={outletModalOpen}
        onOpenChange={setOutletModalOpen}
        outlet={editingOutlet}
        propertyId={outletModalPropertyId}
        currencies={currencies}
        defaultBaseCurrency={chainBaseCurrency}
        onSaved={handleSaved}
      />
      {currencyModalOutlet && (
        <ChangeBaseCurrencyModal
          open
          onOpenChange={(open) => !open && setCurrencyModalOutlet(null)}
          outletId={currencyModalOutlet.id}
          currentSettings={currencyModalOutlet.settings}
          currencies={currencies}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

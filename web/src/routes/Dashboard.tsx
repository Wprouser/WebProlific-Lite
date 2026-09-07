import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, ClipboardList, DollarSign, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { dashboardApi, type ApiOutletDashboard } from '@/lib/dashboard-api';
import { getSession } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';

/**
 * FR-08's dashboard, wired to real data. Always shows the caller's own
 * default outlet (`effectiveOutletIds[0]`) — the same single-outlet default
 * every other screen uses (see TransferList) — rather than a property/chain
 * roll-up, since there's no real property/chain picker to drive one from
 * yet (ContextSwitcher.tsx is still mock-data-driven). The property/chain
 * dashboard endpoints exist and are e2e-reconciliation-tested server-side;
 * consuming them here is deferred to when a real Context Switcher lands.
 */
export function Dashboard() {
  const { t } = useTranslation();
  const outletId = getSession()?.user.effectiveOutletIds[0];

  const [dashboard, setDashboard] = useState<ApiOutletDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!outletId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDashboard(await dashboardApi.getOutlet(outletId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 tablet:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-7 w-7" />}
        title={t('dashboard.loadError')}
        description={error ?? undefined}
        action={<Button onClick={load}>{t('common.refresh')}</Button>}
      />
    );
  }

  const stats = [
    {
      labelKey: 'lowStockItems',
      value: String(dashboard.openLowStockAlerts),
      icon: AlertTriangle,
      hero: true,
    },
    {
      labelKey: 'totalItems',
      value: dashboard.activeItemCount.toLocaleString(),
      icon: Package,
      accentClass: 'bg-accent-blue/10 text-accent-blue',
    },
    {
      labelKey: 'stockValuation',
      value: `${dashboard.currency} ${Number(dashboard.stockValuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      accentClass: 'bg-info/10 text-info',
      note: dashboard.isConverted ? t('dashboard.convertedNote', { currency: dashboard.currency }) : undefined,
    },
    {
      labelKey: 'pendingPoApprovals',
      value: String(dashboard.pendingPoApprovals),
      icon: ClipboardList,
      accentClass: 'bg-accent-blue/10 text-accent-blue',
    },
    {
      labelKey: 'transfersInTransit',
      value: String(dashboard.transfersInTransit),
      icon: ArrowLeftRight,
      accentClass: 'bg-accent-blue/10 text-accent-blue',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-xl font-semibold text-foreground">
        {t('dashboard.title')} <span className="font-sans text-sm font-normal text-foreground-muted">— {dashboard.outletName}</span>
      </h1>

      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 tablet:grid-cols-5">
        {stats.map((stat) => (
          <Card
            key={stat.labelKey}
            className={cn(
              'shadow-md transition-shadow duration-200',
              stat.hero
                ? 'border-none bg-gradient-to-br from-accent-blue-light to-accent-blue shadow-lg'
                : 'hover:shadow-lg',
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
              <CardDescription className={cn('truncate', stat.hero && 'text-white/80')}>
                {t(`dashboard.${stat.labelKey}`)}
              </CardDescription>
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  stat.hero ? 'bg-white/15 text-white' : stat.accentClass,
                )}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className={cn('font-display text-2xl font-bold', stat.hero ? 'text-white' : 'text-foreground')}>
                {stat.value}
              </p>
              {stat.note && <Badge variant="neutral">{stat.note}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

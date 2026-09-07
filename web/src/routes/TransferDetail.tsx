import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { transfersApi, type ApiTransferDetail, type TransferStatus } from '@/lib/transfers-api';
import { getSession } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';

// Client-side gate is a UX nicety only — same pattern as PurchaseOrderDetail
// (APPROVAL_ROLES) and MenuItemDetail: it decides whether to *show* the
// button, not whether the action is allowed. The server checks the real,
// per-outlet role independently and is the actual authority.
const MUTATE_ROLES = ['OUTLET_MANAGER', 'PROPERTY_MANAGER', 'CHAIN_OWNER'];

const STATUS_VARIANT: Record<TransferStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  REQUESTED: 'neutral',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const role = getSession()?.user.effectiveRole ?? '';
  const canManage = MUTATE_ROLES.includes(role);

  const [transfer, setTransfer] = useState<ApiTransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await transfersApi.get(id);
      setTransfer(detail);
      setReceivedQty(Object.fromEntries(detail.lines.map((line) => [line.id, line.quantity])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function dispatch() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await transfersApi.dispatch(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.builder.actionError'));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await transfersApi.cancel(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.builder.actionError'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReceipt() {
    if (!id || !transfer) return;
    setBusy(true);
    setError(null);
    try {
      await transfersApi.receive(
        id,
        transfer.lines.map((line) => ({ transferLineId: line.id, actualReceivedQty: receivedQty[line.id] ?? '0' })),
      );
      setReceiving(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.builder.actionError'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && !transfer) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-7 w-7" />}
        title={t('transfers.loadError')}
        description={error}
        action={<Button onClick={load}>{t('common.refresh')}</Button>}
      />
    );
  }
  if (!transfer) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={() => navigate('/transfers')}
          className="mb-2 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('transfers.backToList')}
        </button>
        <h1 className="flex flex-wrap items-center gap-2 font-display text-xl font-semibold text-foreground">
          <span>{transfer.sourceOutletName}</span>
          <ArrowLeftRight className="h-4 w-4 text-foreground-muted" />
          <span>{transfer.destOutletName}</span>
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[transfer.status]}>{t(`transfers.status.${transfer.status}`)}</Badge>
          <span className="text-sm text-foreground-muted">
            {t('transfers.detail.requestedOn', { date: new Date(transfer.createdAt).toLocaleDateString() })}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="py-2">{t('transfers.columns.sourceItem')}</th>
                <th className="py-2">{t('transfers.columns.destItem')}</th>
                <th className="py-2">{t('transfers.columns.quantity')}</th>
                {(transfer.status === 'RECEIVED' || receiving) && (
                  <th className="py-2">{t('transfers.columns.actualReceived')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfer.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-2">
                    {line.itemName} <span className="text-foreground-muted">({line.itemUnitAbbreviation})</span>
                  </td>
                  <td className="py-2">
                    {line.destItemName}{' '}
                    <span className="text-foreground-muted">({line.destItemUnitAbbreviation})</span>
                  </td>
                  <td className="py-2">{line.quantity}</td>
                  {receiving && (
                    <td className="py-2">
                      <Input
                        aria-label={t('transfers.detail.actualReceivedFor', { item: line.itemName })}
                        className="h-9 w-28 px-2 text-sm"
                        inputMode="decimal"
                        value={receivedQty[line.id] ?? ''}
                        onChange={(e) => setReceivedQty((prev) => ({ ...prev, [line.id]: e.target.value }))}
                      />
                    </td>
                  )}
                  {!receiving && transfer.status === 'RECEIVED' && (
                    <td className="py-2">
                      {line.actualReceivedQty}
                      {line.varianceFlagged && (
                        <Badge variant="warning" className="ms-1.5">
                          {t('transfers.detail.varianceFlagged')}
                        </Badge>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {canManage && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              {transfer.status === 'REQUESTED' && (
                <>
                  <Button variant="outline" onClick={cancel} disabled={busy}>
                    {t('transfers.detail.cancel')}
                  </Button>
                  <Button onClick={dispatch} disabled={busy}>
                    {busy ? t('transfers.detail.dispatching') : t('transfers.detail.dispatch')}
                  </Button>
                </>
              )}
              {transfer.status === 'IN_TRANSIT' && !receiving && (
                <Button onClick={() => setReceiving(true)}>{t('transfers.detail.receive')}</Button>
              )}
              {transfer.status === 'IN_TRANSIT' && receiving && (
                <>
                  <Button variant="outline" onClick={() => setReceiving(false)} disabled={busy}>
                    {t('transfers.detail.cancelReceive')}
                  </Button>
                  <Button onClick={confirmReceipt} disabled={busy}>
                    {busy ? t('transfers.detail.receiving') : t('transfers.detail.confirmReceipt')}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

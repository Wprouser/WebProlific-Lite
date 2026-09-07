import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { transfersApi, type ApiTransferWithOutlets, type TransferStatus } from '@/lib/transfers-api';
import { getSession } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';

const STATUS_VARIANT: Record<TransferStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  REQUESTED: 'neutral',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

/**
 * FR-08's Transfers list. Shows every transfer touching one of the caller's
 * outlets on either side — a transfer inbound to an outlet the caller
 * manages is just as relevant to them as one outbound from it, which is
 * also how the underlying `GET /transfers` scoping works.
 */
export function TransferList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outletId = getSession()?.user.effectiveOutletIds[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<ApiTransferWithOutlets[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | TransferStatus>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTransfers(await transfersApi.list({ status: statusFilter || undefined }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  /** Whether this transfer is inbound to, or outbound from, the caller's
   * own default outlet — a quick visual cue on a list that otherwise shows
   * both directions mixed together. */
  function direction(transfer: ApiTransferWithOutlets): 'in' | 'out' | null {
    if (transfer.destOutletId === outletId) return 'in';
    if (transfer.sourceOutletId === outletId) return 'out';
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{t('transfers.title')}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t('transfers.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/transfers/new')}>
          <Plus className="h-4 w-4" />
          {t('transfers.addNew')}
        </Button>
      </div>

      <Select
        className="w-auto min-w-48"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as '' | TransferStatus)}
      >
        <option value="">{t('transfers.filters.allStatuses')}</option>
        <option value="REQUESTED">{t('transfers.status.REQUESTED')}</option>
        <option value="IN_TRANSIT">{t('transfers.status.IN_TRANSIT')}</option>
        <option value="RECEIVED">{t('transfers.status.RECEIVED')}</option>
        <option value="CANCELLED">{t('transfers.status.CANCELLED')}</option>
      </Select>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-7 w-7" />}
          title={t('transfers.loadError')}
          description={error}
          action={<Button onClick={load}>{t('common.refresh')}</Button>}
        />
      ) : transfers.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-7 w-7" />}
          title={t('transfers.empty.title')}
          description={t('transfers.empty.description')}
          action={<Button onClick={() => navigate('/transfers/new')}>{t('transfers.addNew')}</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="px-4 py-3">{t('transfers.columns.route')}</th>
                <th className="px-4 py-3">{t('transfers.columns.lines')}</th>
                <th className="px-4 py-3">{t('transfers.columns.status')}</th>
                <th className="px-4 py-3">{t('transfers.columns.requested')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.map((transfer) => {
                const dir = direction(transfer);
                return (
                  <tr
                    key={transfer.id}
                    className="cursor-pointer hover:bg-surface-secondary/40"
                    onClick={() => navigate(`/transfers/${transfer.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span>{transfer.sourceOutletName}</span>
                        <ArrowLeftRight className="h-3.5 w-3.5 text-foreground-muted" />
                        <span>{transfer.destOutletName}</span>
                        {dir && (
                          <Badge variant={dir === 'in' ? 'success' : 'neutral'} className="ms-1">
                            {t(`transfers.direction.${dir}`)}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">{transfer.lines.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[transfer.status]}>{t(`transfers.status.${transfer.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

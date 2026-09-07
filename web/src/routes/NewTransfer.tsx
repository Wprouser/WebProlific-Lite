import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import {
  TransferLinesEditor,
  emptyTransferLine,
  type DraftTransferLine,
} from '@/components/transfers/TransferLinesEditor';
import { transfersApi } from '@/lib/transfers-api';
import { outletsApi, type ApiOutlet } from '@/lib/outlets-api';
import { itemsApi, type ApiItem } from '@/lib/items-api';
import { useSelectedContext } from '@/lib/selected-context-store';
import { useUnsavedWorkGuard } from '@/lib/unsaved-work-registry';
import { ApiError } from '@/lib/api-client';

/**
 * FR-08's transfer request builder — a full page, not a modal, matching the
 * established pattern for multi-line documents (PO/GRN, the FR-05 Recipe
 * builder, FR-06's batch import).
 *
 * Both outlet pickers are real: FR-08 is the first place in the app that
 * genuinely needs one, unlike every prior screen's single-default-outlet
 * pattern — see outletsApi.listAccessible and its backend counterpart.
 */
export function NewTransfer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { outletId: contextOutletId } = useSelectedContext();

  const [outlets, setOutlets] = useState<ApiOutlet[]>([]);
  const [sourceOutletId, setSourceOutletId] = useState('');
  const [destOutletId, setDestOutletId] = useState('');
  const [sourceItems, setSourceItems] = useState<ApiItem[]>([]);
  const [destItems, setDestItems] = useState<ApiItem[]>([]);
  const [lines, setLines] = useState<DraftTransferLine[]>([emptyTransferLine()]);

  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    outletsApi
      .listAccessible()
      .then((rows) => {
        setOutlets(rows);
        if (rows.length === 1) {
          setSourceOutletId(rows[0].id);
        } else if (contextOutletId && rows.some((r) => r.id === contextOutletId)) {
          // Pre-selects whatever the header Context Switcher is currently
          // showing — still just a default, freely overridable below.
          setSourceOutletId(contextOutletId);
        }
      })
      .catch(() => setOutlets([]))
      .finally(() => setLoadingOutlets(false));
    // Only the initial pre-fill — deliberately not reactive to a later
    // context switch while this form is open (that's exactly the
    // in-progress work the unsaved-work guard below protects).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sourceOutletId) {
      setSourceItems([]);
      return;
    }
    itemsApi
      .list({ outletId: sourceOutletId, isActive: true })
      .then(setSourceItems)
      .catch(() => setSourceItems([]));
  }, [sourceOutletId]);

  useEffect(() => {
    if (!destOutletId) {
      setDestItems([]);
      return;
    }
    itemsApi
      .list({ outletId: destOutletId, isActive: true })
      .then(setDestItems)
      .catch(() => setDestItems([]));
  }, [destOutletId]);

  // sourceOutletId deliberately excluded — it's often auto-filled on load
  // (a single accessible outlet, or the current Context Switcher
  // selection), which would otherwise mark the form dirty before the user
  // has done anything at all.
  useUnsavedWorkGuard(!!destOutletId || lines.some((l) => l.itemId || l.quantity), t('transfers.addNew'));

  const destOutletOptions = outlets.filter((outlet) => outlet.id !== sourceOutletId);
  const canSubmit =
    sourceOutletId &&
    destOutletId &&
    lines.length > 0 &&
    lines.every((line) => line.itemId && Number(line.quantity) > 0);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const transfer = await transfersApi.create({
        sourceOutletId,
        destOutletId,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          destItemId: line.destItemId || undefined,
        })),
      });
      navigate(`/transfers/${transfer.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('transfers.builder.createError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={() => navigate('/transfers')}
          className="mb-2 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('transfers.backToList')}
        </button>
        <h1 className="font-display text-xl font-semibold text-foreground">{t('transfers.addNew')}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t('transfers.builder.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="source-outlet" className="text-sm font-medium text-foreground">
                {t('transfers.builder.sourceOutlet')}
              </label>
              <Select
                id="source-outlet"
                className="h-11"
                value={sourceOutletId}
                disabled={loadingOutlets}
                onChange={(e) => {
                  setSourceOutletId(e.target.value);
                  if (e.target.value === destOutletId) setDestOutletId('');
                }}
              >
                <option value="">{t('transfers.builder.selectOutlet')}</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dest-outlet" className="text-sm font-medium text-foreground">
                {t('transfers.builder.destOutlet')}
              </label>
              <Select
                id="dest-outlet"
                className="h-11"
                value={destOutletId}
                disabled={!sourceOutletId}
                onChange={(e) => setDestOutletId(e.target.value)}
              >
                <option value="">{t('transfers.builder.selectOutlet')}</option>
                {destOutletOptions.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="font-display text-base font-semibold text-foreground">
              {t('transfers.builder.linesTitle')}
            </h2>
            {!sourceOutletId ? (
              <p className="text-sm text-foreground-muted">{t('transfers.builder.chooseSourceFirst')}</p>
            ) : (
              <TransferLinesEditor
                lines={lines}
                onChange={setLines}
                sourceItems={sourceItems}
                destItems={destItems}
                destOutletChosen={!!destOutletId}
                disabled={submitting}
              />
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? t('transfers.builder.submitting') : t('transfers.builder.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

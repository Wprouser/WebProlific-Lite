import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { itemsApi, type BulkImportRowError } from '@/lib/items-api';
import { useSelectedContext } from '@/lib/selected-context-store';
import { ApiError } from '@/lib/api-client';

/**
 * FR-01 bulk import — a single full page, not a modal, matching the
 * established pattern for a data-heavy multipart flow (PO/GRN, FR-06's
 * sales import). Unlike FR-06 there is no review step: this is a one-shot,
 * all-or-nothing operation per the spec ("validate every row before
 * committing any ... rather than partial success") — either every row is
 * created, or nothing is, with the full per-row error report shown here so
 * the file can be fixed and re-uploaded.
 */
export function BulkImportItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { outletId } = useSelectedContext();

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<BulkImportRowError[] | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !outletId) return;
    setSubmitting(true);
    setError(null);
    setRowErrors(null);
    try {
      const result = await itemsApi.bulkImport(outletId, file);
      setCreatedCount(result.createdCount);
      setFile(null);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { errors?: BulkImportRowError[] } | undefined;
        if (details?.errors) {
          setRowErrors(details.errors);
        } else {
          setError(err.message);
        }
      } else {
        setError(t('items.bulkImport.uploadError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (createdCount !== null) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-medium text-foreground">
              {t('items.bulkImport.successTitle', { count: createdCount })}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCreatedCount(null)}>
                {t('items.bulkImport.tryAgain')}
              </Button>
              <Button onClick={() => navigate('/items')}>{t('items.bulkImport.viewItems')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form className="flex max-w-2xl flex-col gap-5" onSubmit={handleSubmit}>
      <div>
        <button
          type="button"
          onClick={() => navigate('/items')}
          className="mb-2 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('items.bulkImport.backToItems')}
        </button>
        <h1 className="font-display text-xl font-semibold text-foreground">{t('items.bulkImport.title')}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="items-file" className="text-sm font-medium text-foreground">
              {t('items.bulkImport.fileLabel')}
            </label>
            <input
              id="items-file"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
                setRowErrors(null);
              }}
              className="block w-full text-sm text-foreground file:me-3 file:rounded-full file:border-0 file:bg-surface-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-secondary/40 px-4 py-3 text-sm text-foreground-muted">
            <p className="font-medium text-foreground">{t('items.bulkImport.formatTitle')}</p>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              <li>{t('items.bulkImport.formatColumns')}</li>
              <li>{t('items.bulkImport.formatOptional')}</li>
              <li>{t('items.bulkImport.formatNames')}</li>
            </ul>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {rowErrors && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              <p className="font-medium">{t('items.bulkImport.errorsTitle')}</p>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                {rowErrors.map((rowError, index) => (
                  <li key={index}>{t('items.bulkImport.errorRow', { row: rowError.row, error: rowError.error })}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!file || submitting}>
              <Upload className="h-4 w-4" />
              {submitting ? t('items.bulkImport.uploading') : t('items.bulkImport.continue')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

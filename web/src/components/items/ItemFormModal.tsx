import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { itemsApi, type ApiCategory, type ApiItem, type Unit } from '@/lib/items-api';
import { ApiError } from '@/lib/api-client';

const UNITS: Unit[] = ['KG', 'LITRE', 'PIECE', 'BOX', 'GRAM', 'ML'];

export interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; an item = edit that item. */
  item: ApiItem | null;
  categories: ApiCategory[];
  /** The outlet new items are created under — undefined if the session has no accessible outlet. */
  outletId: string | undefined;
  onSaved: () => void;
}

interface FormState {
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  unit: Unit;
  minStock: string;
  maxStock: string;
  costPrice: string;
  storageLocation: string;
}

function emptyForm(defaultCategoryId: string): FormState {
  return {
    name: '',
    categoryId: defaultCategoryId,
    sku: '',
    barcode: '',
    unit: 'KG',
    minStock: '',
    maxStock: '',
    costPrice: '',
    storageLocation: '',
  };
}

/** FR-01's create/edit item form, as a Modal rather than a dedicated route — keeps the user on the list. */
export function ItemFormModal({ open, onOpenChange, item, categories, outletId, onSaved }: ItemFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmingDeactivate(false);
    setForm(
      item
        ? {
            name: item.name,
            categoryId: item.categoryId,
            sku: item.sku,
            barcode: item.barcode ?? '',
            unit: item.unit,
            minStock: item.minStock,
            maxStock: item.maxStock,
            costPrice: item.costPrice ?? '',
            storageLocation: item.storageLocation ?? '',
          }
        : emptyForm(categories[0]?.id ?? ''),
    );
  }, [open, item, categories]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // AC: cannot set minStock >= maxStock — checked client-side for
    // immediate feedback; the server enforces this independently too.
    if (Number(form.minStock) >= Number(form.maxStock)) {
      setError(t('items.form.errorMinMax'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (item) {
        await itemsApi.update(item.id, {
          name: form.name,
          categoryId: form.categoryId,
          sku: form.sku,
          barcode: form.barcode.trim() || null,
          unit: form.unit,
          minStock: form.minStock,
          maxStock: form.maxStock,
          costPrice: form.costPrice,
          storageLocation: form.storageLocation.trim() || null,
        });
      } else {
        if (!outletId) return;
        await itemsApi.create({
          outletId,
          name: form.name,
          categoryId: form.categoryId,
          sku: form.sku,
          barcode: form.barcode.trim() || null,
          unit: form.unit,
          minStock: form.minStock,
          maxStock: form.maxStock,
          costPrice: form.costPrice,
          storageLocation: form.storageLocation.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('items.form.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!item) return;
    setDeactivating(true);
    setError(null);
    try {
      await itemsApi.deactivate(item.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('items.form.saveError'));
      setConfirmingDeactivate(false);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t('items.form.editTitle') : t('items.form.createTitle')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t('items.form.name')}>
          <Input
            required
            value={form.name}
            placeholder={t('items.form.namePlaceholder')}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>

        <Field label={t('items.form.category')}>
          <Select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="" disabled>
              {t('items.form.categoryPlaceholder')}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('items.form.sku')}>
            <Input
              required
              value={form.sku}
              placeholder={t('items.form.skuPlaceholder')}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </Field>
          <Field label={t('items.form.barcode')}>
            <Input
              value={form.barcode}
              placeholder={t('items.form.barcodePlaceholder')}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label={t('items.form.unit')}>
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`items.units.${u}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('items.form.minStock')}>
            <Input
              required
              type="number"
              step="0.001"
              min="0"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            />
          </Field>
          <Field label={t('items.form.maxStock')}>
            <Input
              required
              type="number"
              step="0.001"
              min="0"
              value={form.maxStock}
              onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('items.form.costPrice')}>
            <Input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            />
          </Field>
          <Field label={t('items.form.storageLocation')}>
            <Input
              value={form.storageLocation}
              placeholder={t('items.form.storageLocationPlaceholder')}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            {item?.isActive &&
              (confirmingDeactivate ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-muted">{t('items.form.confirmDeactivate')}</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={deactivating}
                    onClick={handleDeactivate}
                  >
                    {deactivating ? t('items.form.deactivating') : t('items.form.confirmYes')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDeactivate(false)}>
                    {t('items.form.cancel')}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDeactivate(true)}>
                  {t('items.form.deactivate')}
                </Button>
              ))}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('items.form.cancel')}
            </Button>
            <Button type="submit" disabled={saving || (!item && !outletId)}>
              {saving ? t('items.form.saving') : t('items.form.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

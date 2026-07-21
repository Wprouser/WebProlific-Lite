import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CategoryFixture, ItemFixture } from '@/lib/fixtures';

const UNITS = ['KG', 'LITRE', 'PIECE', 'BOX', 'GRAM', 'ML'] as const;
type UnitValue = (typeof UNITS)[number];

export interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; a fixture = edit that item. */
  item: ItemFixture | null;
  categories: CategoryFixture[];
  onSave: (item: ItemFixture) => void;
}

interface FormState {
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  unit: UnitValue;
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

/**
 * FR-01's create/edit item form, as a Modal rather than a dedicated route —
 * keeps the user on the list, same pattern FR-17's Styleguide already
 * demonstrates. Mock-data only (see fixtures.ts): validates and calls
 * `onSave` with a fixture-shaped Item; no backend request yet.
 */
export function ItemFormModal({ open, onOpenChange, item, categories, onSave }: ItemFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
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
            costPrice: item.costPrice,
            storageLocation: item.storageLocation ?? '',
          }
        : emptyForm(categories[0]?.id ?? ''),
    );
  }, [open, item, categories]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // AC: cannot set minStock >= maxStock — same rule FR-01's backend
    // enforces, checked client-side too so the error shows immediately.
    if (Number(form.minStock) >= Number(form.maxStock)) {
      setError(t('items.form.errorMinMax'));
      return;
    }
    setError(null);
    setSaving(true);
    // Mock UI — no backend yet. Simulated round-trip so the "Saving…"
    // state is genuinely exercised, not just decorative.
    window.setTimeout(() => {
      onSave({
        id: item?.id ?? `item-${Date.now()}`,
        name: form.name,
        categoryId: form.categoryId,
        sku: form.sku,
        barcode: form.barcode.trim() || null,
        unit: form.unit,
        minStock: form.minStock,
        maxStock: form.maxStock,
        currentStock: item?.currentStock ?? '0.000',
        costPrice: form.costPrice,
        storageLocation: form.storageLocation.trim() || null,
        isActive: item?.isActive ?? true,
      });
      setSaving(false);
    }, 400);
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
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as UnitValue })}>
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

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('items.form.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('items.form.saving') : t('items.form.save')}
          </Button>
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

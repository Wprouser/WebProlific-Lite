import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { outletsApi, type ApiOutlet } from '@/lib/outlets-api';
import { type ApiCurrency } from '@/lib/currencies-api';
import { ApiError } from '@/lib/api-client';

const OUTLET_TYPES = ['RESTAURANT', 'BAR', 'KITCHEN', 'STORE', 'ROOM_SERVICE'] as const;

export interface OutletFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; an outlet = edit that outlet. */
  outlet: ApiOutlet | null;
  /** Only used for create — the property the new outlet gets added to. */
  propertyId: string | undefined;
  currencies: ApiCurrency[];
  /** The owning chain's base currency, pre-selected for a new outlet
   * (spec: "defaults from the property/chain, overridable") — undefined
   * when unknown (e.g. a PROPERTY_MANAGER, who has no way to read their
   * own chain's currency), in which case the field is just left for the
   * user to pick explicitly. */
  defaultBaseCurrency: string | undefined;
  onSaved: () => void;
}

interface FormState {
  name: string;
  type: (typeof OUTLET_TYPES)[number];
  baseCurrency: string;
  poApprovalThreshold: string;
}

function emptyForm(defaultBaseCurrency: string | undefined): FormState {
  return { name: '', type: 'RESTAURANT', baseCurrency: defaultBaseCurrency ?? '', poApprovalThreshold: '' };
}

function toFormState(outlet: ApiOutlet | null, defaultBaseCurrency: string | undefined): FormState {
  if (!outlet) return emptyForm(defaultBaseCurrency);
  return {
    name: outlet.name,
    type: outlet.type as FormState['type'],
    baseCurrency: outlet.baseCurrency,
    poApprovalThreshold: outlet.poApprovalThreshold ?? '',
  };
}

/**
 * FR-00's Organization screen: Add/Edit Outlet. `baseCurrency` is only
 * editable at CREATE time here — changing it once an outlet already exists
 * must go through the dedicated Currency Settings flow (FR-16's
 * ChangeBaseCurrencyModal), which is CHAIN_OWNER-only and blocked once the
 * outlet has transactional history. Duplicating that here would be a back
 * door around that restriction.
 */
export function OutletFormModal({
  open,
  onOpenChange,
  outlet,
  propertyId,
  currencies,
  defaultBaseCurrency,
  onSaved,
}: OutletFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm(defaultBaseCurrency));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(toFormState(outlet, defaultBaseCurrency));
  }, [open, outlet, defaultBaseCurrency]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (outlet) {
        await outletsApi.update(outlet.id, {
          name: form.name,
          type: form.type,
          poApprovalThreshold: form.poApprovalThreshold || undefined,
        });
      } else {
        if (!propertyId) return;
        await outletsApi.create(propertyId, {
          name: form.name,
          type: form.type,
          baseCurrency: form.baseCurrency || undefined,
          poApprovalThreshold: form.poApprovalThreshold || undefined,
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('organization.form.permissionError'));
      } else {
        setError(err instanceof ApiError ? err.message : t('organization.form.saveError'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={outlet ? t('organization.outletForm.editTitle') : t('organization.outletForm.createTitle')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.name')}</span>
          <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.type')}</span>
          <Select value={form.type} onChange={(e) => set('type', e.target.value as FormState['type'])}>
            {OUTLET_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`organization.outletType.${type}`)}
              </option>
            ))}
          </Select>
        </label>
        {!outlet && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{t('organization.form.baseCurrency')}</span>
            <Select value={form.baseCurrency} onChange={(e) => set('baseCurrency', e.target.value)}>
              <option value="">{t('organization.outletForm.baseCurrencyPlaceholder')}</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.poApprovalThreshold')}</span>
          <Input
            inputMode="decimal"
            placeholder={t('organization.outletForm.poApprovalThresholdPlaceholder')}
            value={form.poApprovalThreshold}
            onChange={(e) => set('poApprovalThreshold', e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('organization.form.cancel')}
          </Button>
          <Button type="submit" disabled={saving || (!outlet && !propertyId)}>
            {saving ? t('organization.form.saving') : t('organization.form.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

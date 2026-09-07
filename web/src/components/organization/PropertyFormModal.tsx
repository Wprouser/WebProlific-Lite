import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { propertiesApi, type ApiPropertyWithOutlets } from '@/lib/properties-api';
import { ApiError } from '@/lib/api-client';

const PROPERTY_TYPES = ['HOTEL', 'STANDALONE_RESTAURANT', 'RESTAURANT_GROUP_SITE'] as const;

export interface PropertyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; a property = edit that property. */
  property: ApiPropertyWithOutlets | null;
  /** Only used for create — where the new property gets added. */
  chainId: string | undefined;
  onSaved: () => void;
}

interface FormState {
  name: string;
  type: (typeof PROPERTY_TYPES)[number];
  address: string;
  timezone: string;
}

const EMPTY_FORM: FormState = { name: '', type: 'HOTEL', address: '', timezone: '' };

function toFormState(property: ApiPropertyWithOutlets | null): FormState {
  if (!property) return EMPTY_FORM;
  return {
    name: property.name,
    type: property.type as FormState['type'],
    address: property.address ?? '',
    timezone: property.timezone,
  };
}

/** FR-00's Organization screen: Add/Edit Property. Create is CHAIN_OWNER
 * only (gated by the screen, not here — this modal is only ever reachable
 * when the caller already has the right to open it). */
export function PropertyFormModal({ open, onOpenChange, property, chainId, onSaved }: PropertyFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(toFormState(property));
  }, [open, property]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { name: form.name, type: form.type, address: form.address || undefined, timezone: form.timezone || undefined };
      if (property) {
        await propertiesApi.update(property.id, payload);
      } else {
        if (!chainId) return;
        await propertiesApi.create(chainId, payload);
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
      title={property ? t('organization.propertyForm.editTitle') : t('organization.propertyForm.createTitle')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.name')}</span>
          <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.type')}</span>
          <Select value={form.type} onChange={(e) => set('type', e.target.value as FormState['type'])}>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`organization.propertyType.${type}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.address')}</span>
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('organization.form.timezone')}</span>
          <Input
            placeholder="Asia/Riyadh"
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('organization.form.cancel')}
          </Button>
          <Button type="submit" disabled={saving || (!property && !chainId)}>
            {saving ? t('organization.form.saving') : t('organization.form.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

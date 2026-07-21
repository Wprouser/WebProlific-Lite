import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { categoriesApi, type ApiCategory } from '@/lib/items-api';
import { ApiError } from '@/lib/api-client';

export interface CategoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ApiCategory[];
  outletId: string | undefined;
  onCreate: (category: ApiCategory) => void;
}

/**
 * FR-01's category management is deliberately minimal — create + list
 * only, matching the spec's own endpoint table (no edit/delete for
 * categories). A small secondary Modal off the Items list, not its own
 * route.
 */
export function CategoryManagerModal({ open, onOpenChange, categories, outletId, onCreate }: CategoryManagerModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !outletId) return;
    setError(null);
    setSaving(true);
    try {
      const category = await categoriesApi.create(trimmed, outletId);
      onCreate(category);
      setName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('items.form.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('items.categoryManager.title')}
      description={t('items.categoryManager.description')}
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={name}
          placeholder={t('items.categoryManager.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" className="shrink-0" disabled={saving || !outletId}>
          {saving ? t('items.form.saving') : t('items.categoryManager.add')}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <ul className="mt-4 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        {categories.length === 0 && (
          <li className="px-3 py-2 text-sm text-foreground-muted">{t('items.categoryManager.empty')}</li>
        )}
        {categories.map((c) => (
          <li key={c.id} className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface-secondary">
            {c.name}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

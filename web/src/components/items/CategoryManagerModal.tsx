import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { categoriesApi, type ApiCategory } from '@/lib/items-api';
import { ApiError } from '@/lib/api-client';

export interface CategoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ApiCategory[];
  outletId: string | undefined;
  onCreate: (category: ApiCategory) => void;
  onUpdate: (category: ApiCategory) => void;
}

/**
 * FR-01's Category management — same modal-off-the-Items-screen pattern as
 * UnitManagerModal, with the same real Edit/Deactivate actions Category now
 * supports at parity with Unit of Measure (both are outlet-scoped 1:1
 * master data with the identical soft-deactivation contract: deactivating
 * never affects any Item already using it, it only stops appearing as an
 * option for new/edited items).
 */
export function CategoryManagerModal({
  open,
  onOpenChange,
  categories,
  outletId,
  onCreate,
  onUpdate,
}: CategoryManagerModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

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

  function startEdit(category: ApiCategory) {
    setError(null);
    setEditingId(category.id);
    setEditName(category.name);
  }

  async function saveEdit(category: ApiCategory) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setError(null);
    setRowBusyId(category.id);
    try {
      const updated = await categoriesApi.update(category.id, { name: trimmed });
      onUpdate(updated);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('items.categoryManager.saveError'));
    } finally {
      setRowBusyId(null);
    }
  }

  async function toggleActive(category: ApiCategory) {
    setError(null);
    setRowBusyId(category.id);
    try {
      const updated = category.isActive
        ? await categoriesApi.deactivate(category.id)
        : await categoriesApi.update(category.id, { isActive: true });
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('items.categoryManager.saveError'));
    } finally {
      setRowBusyId(null);
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
          <li key={c.id} className="rounded-md px-3 py-2 text-sm hover:bg-surface-secondary">
            {editingId === c.id ? (
              <div className="flex items-center gap-2">
                <Input
                  className="h-9 flex-1 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t('items.form.cancel')}
                </Button>
                <Button size="sm" disabled={rowBusyId === c.id} onClick={() => saveEdit(c)}>
                  {t('items.unitManager.save')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-foreground">{c.name}</span>
                <Badge variant={c.isActive ? 'success-solid' : 'neutral'}>
                  {c.isActive ? t('items.status.active') : t('items.status.inactive')}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('items.unitManager.edit')}
                  onClick={() => startEdit(c)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={rowBusyId === c.id}
                  aria-label={c.isActive ? t('items.unitManager.deactivate') : t('items.unitManager.reactivate')}
                  onClick={() => toggleActive(c)}
                >
                  {c.isActive ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

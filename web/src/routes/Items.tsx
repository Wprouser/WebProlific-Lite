import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/ResponsiveTable';
import { ItemFormModal } from '@/components/items/ItemFormModal';
import { CategoryManagerModal } from '@/components/items/CategoryManagerModal';
import { mockCategories, mockItems, type CategoryFixture, type ItemFixture } from '@/lib/fixtures';

type StatusFilter = 'active' | 'inactive' | 'all';

/**
 * FR-01: Item Master list, plus create/edit and category management as
 * Modals off this screen. Mock-data-driven (see fixtures.ts) — the real
 * FR-01 backend exists (GET/POST/PATCH/DELETE /items,
 * GET/POST /items/categories) but wiring the frontend to it is a separate
 * pass, same scope decision every other screen in web/ has made so far.
 */
export function Items() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemFixture[]>([]);
  const [categories, setCategories] = useState<CategoryFixture[]>(mockCategories);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [belowMinOnly, setBelowMinOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemFixture | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  useEffect(() => {
    // Brief simulated load so the Skeleton state is genuinely exercised —
    // FR-17: "every list/dashboard screen has a ... loading skeleton", not
    // just an empty-state/error-state afterthought.
    const id = window.setTimeout(() => {
      setItems(mockItems);
      setLoading(false);
    }, 400);
    return () => window.clearTimeout(id);
  }, []);

  const categoryName = (categoryId: string) => categories.find((c) => c.id === categoryId)?.name ?? '—';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (categoryFilter && item.categoryId !== categoryFilter) return false;
      // AC: GET /items?belowMinStock=true returns only items where
      // currentStock < minStock — same rule, applied client-side here.
      if (belowMinOnly && Number(item.currentStock) >= Number(item.minStock)) return false;
      if (query && !item.name.toLowerCase().includes(query) && !item.sku.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [items, search, categoryFilter, statusFilter, belowMinOnly]);

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: ItemFixture) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleSave(item: ItemFixture) {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev]));
    setFormOpen(false);
  }

  function handleCreateCategory(category: CategoryFixture) {
    setCategories((prev) => [...prev, category]);
  }

  const columns: ResponsiveTableColumn<ItemFixture>[] = [
    {
      key: 'name',
      header: t('items.table.name'),
      render: (item) => (
        <button
          onClick={() => openEdit(item)}
          className="text-left font-medium text-foreground hover:text-primary hover:underline"
        >
          {item.name}
        </button>
      ),
    },
    {
      key: 'sku',
      header: t('items.table.sku'),
      render: (item) => <span className="text-foreground-muted">{item.sku}</span>,
    },
    {
      key: 'category',
      header: t('items.table.category'),
      render: (item) => categoryName(item.categoryId),
    },
    {
      key: 'stock',
      header: t('items.table.stock'),
      render: (item) => (
        <span className="flex flex-wrap items-center gap-2">
          <span>
            {item.currentStock} {t(`items.units.${item.unit}`)}
          </span>
          {Number(item.currentStock) < Number(item.minStock) && (
            <Badge variant="danger-solid">{t('items.status.lowStock')}</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'costPrice',
      header: t('items.table.costPrice'),
      render: (item) => item.costPrice,
    },
    {
      key: 'status',
      header: t('items.table.status'),
      render: (item) => (
        <Badge variant={item.isActive ? 'success-solid' : 'neutral'}>
          {item.isActive ? t('items.status.active') : t('items.status.inactive')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{t('items.title')}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t('items.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Settings2 className="h-4 w-4" />
            {t('items.manageCategories')}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('items.addItem')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            className="pl-11"
            placeholder={t('items.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-auto min-w-40"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">{t('items.filters.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-36"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">{t('items.filters.allStatus')}</option>
          <option value="active">{t('items.filters.active')}</option>
          <option value="inactive">{t('items.filters.inactive')}</option>
        </Select>
        <label className="flex h-12 items-center gap-2 rounded-md border border-border-strong px-4 text-sm text-foreground-muted">
          <input
            type="checkbox"
            checked={belowMinOnly}
            onChange={(e) => setBelowMinOnly(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t('items.filters.belowMinStock')}
        </label>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={items.length === 0 ? t('items.empty.titleNoItems') : t('items.empty.title')}
          description={items.length === 0 ? t('items.empty.descriptionNoItems') : t('items.empty.description')}
          action={items.length === 0 ? <Button onClick={openCreate}>{t('items.empty.action')}</Button> : undefined}
        />
      ) : (
        <ResponsiveTable columns={columns} data={filtered} getRowKey={(item) => item.id} />
      )}

      <ItemFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        categories={categories}
        onSave={handleSave}
      />
      <CategoryManagerModal
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories}
        onCreate={handleCreateCategory}
      />
    </div>
  );
}

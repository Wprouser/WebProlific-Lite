import { useState } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/ResponsiveTable';

interface ItemRow {
  id: string;
  name: string;
  category: string;
  stock: string;
  status: 'ok' | 'low' | 'out';
}

const mockItems: ItemRow[] = [
  { id: '1', name: 'All-Purpose Flour', category: 'Dry Goods', stock: '42 kg', status: 'ok' },
  { id: '2', name: 'Olive Oil (5L)', category: 'Oils', stock: '3 bottles', status: 'low' },
  { id: '3', name: 'Fresh Basil', category: 'Produce', stock: '0 bunches', status: 'out' },
];

const statusVariant: Record<ItemRow['status'], 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  low: 'warning',
  out: 'danger',
};

// Design-token identifiers, not UI copy — left untranslated deliberately,
// same as we wouldn't translate a CSS class or variable name.
const paletteSwatches: { name: string; className: string; on?: 'light' | 'dark' }[] = [
  { name: 'background', className: 'bg-background' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-secondary', className: 'bg-surface-secondary' },
  { name: 'border-strong', className: 'bg-border-strong' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'info', className: 'bg-info' },
];

/**
 * In-app component showcase — the proof surface for FR-17's acceptance
 * criteria (focal-point review, dark-mode contrast check, breakpoint
 * resize check) since no real feature screens exist yet to check against.
 * No Storybook: staying in the same Vite dev server is simpler for a
 * project this size.
 */
export function Styleguide() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const columns: ResponsiveTableColumn<ItemRow>[] = [
    { key: 'name', header: t('styleguide.table.item'), render: (row) => row.name },
    { key: 'category', header: t('styleguide.table.category'), render: (row) => row.category },
    { key: 'stock', header: t('styleguide.table.onHand'), render: (row) => row.stock },
    {
      key: 'status',
      header: t('styleguide.table.status'),
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{t(`styleguide.table.statusValues.${row.status}`)}</Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">{t('styleguide.title')}</h1>
        <p className="mt-1.5 text-base text-foreground-muted">{t('styleguide.subtitle')}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t('styleguide.sections.palette')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 tablet:grid-cols-6">
          {paletteSwatches.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-md border border-border-strong shadow-sm ${swatch.className}`}
              />
              <span className="text-xs font-medium text-foreground-muted">{swatch.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t('styleguide.sections.buttons')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{t('styleguide.buttons.primary')}</Button>
          <Button variant="secondary">{t('styleguide.buttons.secondary')}</Button>
          <Button variant="outline">{t('styleguide.buttons.outline')}</Button>
          <Button variant="ghost">{t('styleguide.buttons.ghost')}</Button>
          <Button variant="danger">{t('styleguide.buttons.danger')}</Button>
          <Button variant="primary" disabled>
            {t('styleguide.buttons.disabled')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">{t('styleguide.buttons.small')}</Button>
          <Button size="md">{t('styleguide.buttons.medium')}</Button>
          <Button size="lg">{t('styleguide.buttons.large')}</Button>
          <Button size="icon" aria-label={t('styleguide.buttons.addItem')}>
            <Package className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t('styleguide.sections.badges')}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{t('styleguide.badges.neutral')}</Badge>
          <Badge variant="primary">{t('styleguide.badges.primary')}</Badge>
          <Badge variant="success">{t('styleguide.badges.success')}</Badge>
          <Badge variant="warning">{t('styleguide.badges.warning')}</Badge>
          <Badge variant="danger">{t('styleguide.badges.danger')}</Badge>
          <Badge variant="info">{t('styleguide.badges.info')}</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t('styleguide.sections.cardInput')}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('styleguide.card.reorderThreshold')}</CardTitle>
              <CardDescription>{t('styleguide.card.reorderThresholdDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder={t('styleguide.card.placeholder')} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('styleguide.card.invalidInput')}</CardTitle>
              <CardDescription>{t('styleguide.card.invalidInputDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Input defaultValue={t('styleguide.card.invalidValue')} error />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t('styleguide.sections.modal')}</h2>
        <div>
          <Button onClick={() => setModalOpen(true)}>{t('styleguide.modal.openModal')}</Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title={t('styleguide.modal.confirmDeactivation')}
            description={t('styleguide.modal.confirmDeactivationDesc')}
          >
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                {t('styleguide.modal.cancel')}
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                {t('styleguide.modal.deactivate')}
              </Button>
            </div>
          </Modal>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('styleguide.sections.responsiveTable')}{' '}
          <span className="text-sm font-normal text-foreground-muted">
            {t('styleguide.sections.responsiveTableHint')}
          </span>
        </h2>
        <ResponsiveTable columns={columns} data={mockItems} getRowKey={(row) => row.id} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('styleguide.sections.emptyLoading')}
        </h2>
        <Button variant="outline" className="self-start" onClick={() => setShowEmpty((v) => !v)}>
          {t('styleguide.empty.toggle')}
        </Button>
        {showEmpty ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title={t('styleguide.empty.noItemsYet')}
            description={t('styleguide.empty.noItemsYetDesc')}
            action={<Button>{t('styleguide.empty.addItem')}</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </section>
    </div>
  );
}

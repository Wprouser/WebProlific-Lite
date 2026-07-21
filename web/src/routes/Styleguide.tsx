import { useState } from 'react';
import { Package } from 'lucide-react';
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

const columns: ResponsiveTableColumn<ItemRow>[] = [
  { key: 'name', header: 'Item', render: (row) => row.name },
  { key: 'category', header: 'Category', render: (row) => row.category },
  { key: 'stock', header: 'On hand', render: (row) => row.stock },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status.toUpperCase()}</Badge>,
  },
];

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
  const [modalOpen, setModalOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Styleguide</h1>
        <p className="mt-1.5 text-base text-foreground-muted">
          Core FR-17 components, rendered against the live design tokens.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Palette</h2>
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
        <h2 className="font-display text-xl font-semibold text-foreground">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add item">
            <Package className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Card &amp; Input</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Reorder threshold</CardTitle>
              <CardDescription>Applies chain-wide unless overridden per outlet.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="e.g. 10" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invalid input state</CardTitle>
              <CardDescription>error prop drives the border/ring color.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input defaultValue="not a number" error />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Modal</h2>
        <div>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Confirm deactivation"
            description="This preserves historical records — it can be reversed later."
          >
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Deactivate
              </Button>
            </div>
          </Modal>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Responsive table{' '}
          <span className="text-sm font-normal text-foreground-muted">
            (resize below md to see the card layout)
          </span>
        </h2>
        <ResponsiveTable columns={columns} data={mockItems} getRowKey={(row) => row.id} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Empty &amp; loading states</h2>
        <Button variant="outline" className="self-start" onClick={() => setShowEmpty((v) => !v)}>
          Toggle empty state
        </Button>
        {showEmpty ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="No items yet"
            description="Add your first item to start tracking stock."
            action={<Button>Add item</Button>}
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

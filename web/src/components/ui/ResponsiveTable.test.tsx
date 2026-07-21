import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResponsiveTable, type ResponsiveTableColumn } from './ResponsiveTable';

interface Row {
  id: string;
  name: string;
  stock: string;
}

const columns: ResponsiveTableColumn<Row>[] = [
  { key: 'name', header: 'Item', render: (r) => r.name },
  { key: 'stock', header: 'Stock', render: (r) => r.stock },
];
const data: Row[] = [
  { id: '1', name: 'Flour', stock: '42kg' },
  { id: '2', name: 'Sugar', stock: '10kg' },
];

describe('ResponsiveTable', () => {
  it('renders a real <table> for the md+ layout, hidden below md', () => {
    render(<ResponsiveTable columns={columns} data={data} getRowKey={(r) => r.id} />);
    const table = screen.getByRole('table');
    expect(table.closest('div')).toHaveClass('hidden', 'md:block');
  });

  it('renders every row in both the table and the stacked-card layout', () => {
    render(<ResponsiveTable columns={columns} data={data} getRowKey={(r) => r.id} />);
    // Each value appears twice: once in <table>, once in the card layout.
    expect(screen.getAllByText('Flour')).toHaveLength(2);
    expect(screen.getAllByText('42kg')).toHaveLength(2);
  });

  it('the stacked-card container is hidden at md+ (md:hidden)', () => {
    const { container } = render(
      <ResponsiveTable columns={columns} data={data} getRowKey={(r) => r.id} />,
    );
    const cardContainer = container.querySelector('.md\\:hidden');
    expect(cardContainer).not.toBeNull();
  });

  it('renders the provided empty state when data is empty', () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={[]}
        getRowKey={(r) => r.id}
        emptyState={<p>Nothing here yet</p>}
      />,
    );
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

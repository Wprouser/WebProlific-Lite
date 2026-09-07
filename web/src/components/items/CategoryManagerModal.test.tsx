import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CategoryManagerModal } from './CategoryManagerModal';
import { categoriesApi, type ApiCategory } from '@/lib/items-api';

vi.mock('@/lib/items-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/items-api')>('@/lib/items-api');
  return {
    ...actual,
    categoriesApi: { ...actual.categoriesApi, create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
  };
});

const dryGoods: ApiCategory = {
  id: 'c1',
  name: 'Dry Goods',
  outletId: 'o1',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const discontinued: ApiCategory = {
  id: 'c2',
  name: 'Discontinued Line',
  outletId: 'o1',
  isActive: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function renderModal(categories: ApiCategory[] = [dryGoods], onUpdate = vi.fn()) {
  return render(
    <CategoryManagerModal
      open
      onOpenChange={vi.fn()}
      categories={categories}
      outletId="o1"
      onCreate={vi.fn()}
      onUpdate={onUpdate}
    />,
  );
}

describe('CategoryManagerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC: creates a category for the given outlet', async () => {
    asMock(categoriesApi.create).mockResolvedValue(dryGoods);
    renderModal([]);

    await userEvent.type(screen.getByPlaceholderText('New category name'), 'Dry Goods');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(categoriesApi.create).toHaveBeenCalledWith('Dry Goods', 'o1');
  });

  it('shows each category\'s active/inactive status', () => {
    renderModal([dryGoods, discontinued]);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('AC: editing renames a category', async () => {
    const onUpdate = vi.fn();
    asMock(categoriesApi.update).mockResolvedValue({ ...dryGoods, name: 'Dry Goods & Grains' });
    renderModal([dryGoods], onUpdate);

    await userEvent.click(screen.getByLabelText('Edit'));
    const input = screen.getByDisplayValue('Dry Goods');
    await userEvent.clear(input);
    await userEvent.type(input, 'Dry Goods & Grains');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(categoriesApi.update).toHaveBeenCalledWith('c1', { name: 'Dry Goods & Grains' });
    expect(onUpdate).toHaveBeenCalledWith({ ...dryGoods, name: 'Dry Goods & Grains' });
  });

  it('AC: deactivating an active category calls deactivate, never a hard delete', async () => {
    asMock(categoriesApi.deactivate).mockResolvedValue({ ...dryGoods, isActive: false });
    renderModal([dryGoods]);

    await userEvent.click(screen.getByLabelText('Deactivate'));
    expect(categoriesApi.deactivate).toHaveBeenCalledWith('c1');
  });

  it('AC: reactivating an inactive category calls update with isActive: true', async () => {
    asMock(categoriesApi.update).mockResolvedValue({ ...discontinued, isActive: true });
    renderModal([discontinued]);

    await userEvent.click(screen.getByLabelText('Reactivate'));
    expect(categoriesApi.update).toHaveBeenCalledWith('c2', { isActive: true });
  });

  it('surfaces the server\'s reason when saving fails', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    asMock(categoriesApi.create).mockRejectedValue(new ApiError(409, 'A category with this name already exists'));
    renderModal([]);

    await userEvent.type(screen.getByPlaceholderText('New category name'), 'Dry Goods');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('A category with this name already exists')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BulkImportItems } from './BulkImportItems';
import { itemsApi } from '@/lib/items-api';
import { setSession } from '@/lib/auth-store';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/lib/items-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/items-api')>('@/lib/items-api');
  return { ...actual, itemsApi: { ...actual.itemsApi, bulkImport: vi.fn() } };
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <BulkImportItems />
    </MemoryRouter>,
  );
}

function csvFile() {
  return new File(['Name,Category,SKU,Unit,Min Stock,Max Stock,Cost Price\nRice,Dry Goods,RICE-001,Kilogram,10,100,85.50'], 'items.csv', {
    type: 'text/csv',
  });
}

describe('BulkImportItems screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession({
      accessToken: 'token',
      refreshToken: 'refresh-token',
      user: {
        id: 'u1',
        email: 'test@example.com',
        preferredLanguage: 'en',
        effectiveRole: 'OUTLET_MANAGER',
        effectiveOutletIds: ['o1'], effectivePropertyIds: [], effectiveChainIds: [],
      },
    });
  });

  it('cannot be submitted without a file', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: 'Upload and import' })).toBeDisabled();
  });

  it('AC: on success, shows the created count and offers to view items', async () => {
    (itemsApi.bulkImport as ReturnType<typeof vi.fn>).mockResolvedValue({ createdCount: 3, items: [] });
    renderScreen();

    await userEvent.upload(screen.getByLabelText('Items file (CSV or Excel)'), csvFile());
    await userEvent.click(screen.getByRole('button', { name: 'Upload and import' }));

    expect(itemsApi.bulkImport).toHaveBeenCalledWith('o1', expect.any(File));
    expect(await screen.findByText('3 item(s) imported')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View items' }));
    expect(navigateMock).toHaveBeenCalledWith('/items');
  });

  it('AC: on a validation failure, shows the full per-row error report and creates nothing', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    (itemsApi.bulkImport as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(400, 'Bulk import failed validation — no items were created', {
        message: 'Bulk import failed validation — no items were created',
        errors: [
          { row: 2, error: 'Category "Nonexistent" was not found (or is inactive) for this outlet' },
          { row: 5, error: 'duplicate SKU "RICE-001" within this file' },
        ],
      }),
    );
    renderScreen();

    await userEvent.upload(screen.getByLabelText('Items file (CSV or Excel)'), csvFile());
    await userEvent.click(screen.getByRole('button', { name: 'Upload and import' }));

    const alert = await screen.findByText(/Nothing was imported/);
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Row 2: Category "Nonexistent" was not found (or is inactive) for this outlet')).toBeInTheDocument();
    expect(screen.getByText('Row 5: duplicate SKU "RICE-001" within this file')).toBeInTheDocument();
  });

  it('shows a plain message when the failure has no structured per-row report (e.g. an unreadable file)', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    (itemsApi.bulkImport as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(400, 'Could not find a header row.', { message: 'Could not find a header row.' }),
    );
    renderScreen();

    await userEvent.upload(screen.getByLabelText('Items file (CSV or Excel)'), csvFile());
    await userEvent.click(screen.getByRole('button', { name: 'Upload and import' }));

    expect(await screen.findByText('Could not find a header row.')).toBeInTheDocument();
  });
});

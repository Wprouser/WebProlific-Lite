import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TransferList } from './TransferList';
import { transfersApi, type ApiTransferWithOutlets } from '@/lib/transfers-api';
import { setSession } from '@/lib/auth-store';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/lib/transfers-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/transfers-api')>('@/lib/transfers-api');
  return { ...actual, transfersApi: { ...actual.transfersApi, list: vi.fn() } };
});

function transfer(overrides: Partial<ApiTransferWithOutlets> = {}): ApiTransferWithOutlets {
  return {
    id: 't1',
    sourceOutletId: 'o1',
    destOutletId: 'o2',
    sourceOutletName: 'Main Kitchen',
    destOutletName: 'Poolside Bar',
    status: 'REQUESTED',
    requestedById: 'u1',
    dispatchedById: null,
    receivedById: null,
    lines: [
      { id: 'l1', transferId: 't1', itemId: 'i1', destItemId: 'i2', quantity: '5.000', actualReceivedQty: null, varianceFlagged: false },
    ],
    createdAt: '2026-08-06T10:00:00.000Z',
    dispatchedAt: null,
    receivedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter>
      <TransferList />
    </MemoryRouter>,
  );
}

describe('TransferList screen', () => {
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

  it('lists transfers with route, status and line count', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([transfer()]);
    renderScreen();

    const nameCell = await screen.findByText('Main Kitchen');
    const row = within(nameCell.closest('tr')!);
    expect(row.getByText('Poolside Bar')).toBeInTheDocument();
    // Scoped to the row: "Requested" also appears as an <option> in the
    // status filter above the table.
    expect(row.getByText('Requested')).toBeInTheDocument();
    expect(row.getByRole('cell', { name: '1' })).toBeInTheDocument();
  });

  it('marks a transfer outbound from the caller\'s own outlet', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([transfer()]);
    renderScreen();

    const row = (await screen.findByText('Main Kitchen')).closest('tr')!;
    expect(within(row).getByText('Outbound')).toBeInTheDocument();
  });

  it('marks a transfer inbound to the caller\'s own outlet', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      transfer({ sourceOutletId: 'o2', destOutletId: 'o1', sourceOutletName: 'Poolside Bar', destOutletName: 'Main Kitchen' }),
    ]);
    renderScreen();

    const row = (await screen.findByText('Poolside Bar')).closest('tr')!;
    expect(within(row).getByText('Inbound')).toBeInTheDocument();
  });

  it('opens the detail screen when a row is clicked', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([transfer()]);
    renderScreen();

    const cell = await screen.findByText('Main Kitchen');
    await userEvent.click(cell.closest('tr')!);
    expect(navigateMock).toHaveBeenCalledWith('/transfers/t1');
  });

  it('navigates to the New Transfer screen from the header action', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderScreen();

    await userEvent.click(await screen.findByRole('button', { name: 'New Transfer' }));
    expect(navigateMock).toHaveBeenCalledWith('/transfers/new');
  });

  it('filters by status', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([transfer()]);
    renderScreen();
    await screen.findByText('Main Kitchen');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'IN_TRANSIT');
    expect(transfersApi.list).toHaveBeenLastCalledWith({ status: 'IN_TRANSIT' });
  });

  it('shows an empty state when there are no transfers', async () => {
    (transfersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('No transfers yet')).toBeInTheDocument();
  });
});

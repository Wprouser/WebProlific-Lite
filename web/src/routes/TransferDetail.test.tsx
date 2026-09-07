import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TransferDetail } from './TransferDetail';
import { transfersApi, type ApiTransferDetail } from '@/lib/transfers-api';
import { setSession } from '@/lib/auth-store';

vi.mock('@/lib/transfers-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/transfers-api')>('@/lib/transfers-api');
  return {
    ...actual,
    transfersApi: { ...actual.transfersApi, get: vi.fn(), dispatch: vi.fn(), receive: vi.fn(), cancel: vi.fn() },
  };
});

function transfer(overrides: Partial<ApiTransferDetail> = {}): ApiTransferDetail {
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
      {
        id: 'l1',
        transferId: 't1',
        itemId: 'i1',
        destItemId: 'i2',
        quantity: '5.000',
        actualReceivedQty: null,
        varianceFlagged: false,
        itemName: 'Basmati Rice',
        itemUnitAbbreviation: 'kg',
        destItemName: 'Basmati Rice',
        destItemUnitAbbreviation: 'kg',
      },
    ],
    createdAt: '2026-08-06T10:00:00.000Z',
    dispatchedAt: null,
    receivedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/transfers/t1']}>
      <Routes>
        <Route path="/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TransferDetail screen', () => {
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
        effectiveOutletIds: ['o1', 'o2'],
      },
    });
    asMock(transfersApi.get).mockResolvedValue(transfer());
  });

  it('shows both outlets, status, and the item lines', async () => {
    renderScreen();
    expect(await screen.findByText('Main Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Poolside Bar')).toBeInTheDocument();
    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getAllByText('Basmati Rice', { exact: false }).length).toBeGreaterThan(0);
  });

  it('AC: offers Dispatch and Cancel while REQUESTED', async () => {
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Dispatch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel transfer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument();
  });

  it('dispatches and reloads the transfer', async () => {
    asMock(transfersApi.dispatch).mockResolvedValue({ id: 't1', status: 'IN_TRANSIT' });
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'Dispatch' }));

    expect(transfersApi.dispatch).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(transfersApi.get).toHaveBeenCalledTimes(2));
  });

  it('cancels the transfer', async () => {
    asMock(transfersApi.cancel).mockResolvedValue({ id: 't1', status: 'CANCELLED' });
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel transfer' }));

    expect(transfersApi.cancel).toHaveBeenCalledWith('t1');
  });

  it('AC: offers Receive once IN_TRANSIT, not Dispatch or Cancel', async () => {
    asMock(transfersApi.get).mockResolvedValue(transfer({ status: 'IN_TRANSIT' }));
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Receive' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel transfer' })).not.toBeInTheDocument();
  });

  it('AC: receiving pre-fills the dispatched quantity, editable before confirming', async () => {
    asMock(transfersApi.get).mockResolvedValue(transfer({ status: 'IN_TRANSIT' }));
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'Receive' }));

    const qtyInput = screen.getByLabelText('Actual quantity received for Basmati Rice') as HTMLInputElement;
    expect(qtyInput.value).toBe('5.000');

    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '4.000');

    asMock(transfersApi.receive).mockResolvedValue({ id: 't1', status: 'RECEIVED' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm receipt' }));

    expect(transfersApi.receive).toHaveBeenCalledWith('t1', [{ transferLineId: 'l1', actualReceivedQty: '4.000' }]);
  });

  it('shows a variance badge on a received line once flagged', async () => {
    asMock(transfersApi.get).mockResolvedValue(
      transfer({
        status: 'RECEIVED',
        lines: [{ ...transfer().lines[0], actualReceivedQty: '4.000', varianceFlagged: true }],
      }),
    );
    renderScreen();
    expect(await screen.findByText('Variance')).toBeInTheDocument();
  });

  it('offers no mutating actions once RECEIVED', async () => {
    asMock(transfersApi.get).mockResolvedValue(transfer({ status: 'RECEIVED' }));
    renderScreen();
    await screen.findByText('Received');
    expect(screen.queryByRole('button', { name: 'Dispatch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel transfer' })).not.toBeInTheDocument();
  });

  it('surfaces the server\'s reason when an action is refused', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    asMock(transfersApi.dispatch).mockRejectedValue(
      new ApiError(400, 'Insufficient stock to dispatch "Basmati Rice" — 2.000 on hand, 5.000 requested.'),
    );
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'Dispatch' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock');
  });
});

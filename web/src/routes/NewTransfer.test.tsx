import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NewTransfer } from './NewTransfer';
import { transfersApi } from '@/lib/transfers-api';
import { outletsApi, type ApiOutlet } from '@/lib/outlets-api';
import { itemsApi, type ApiItem } from '@/lib/items-api';
import { setSession } from '@/lib/auth-store';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/lib/transfers-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/transfers-api')>('@/lib/transfers-api');
  return { ...actual, transfersApi: { ...actual.transfersApi, create: vi.fn() } };
});
vi.mock('@/lib/outlets-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/outlets-api')>('@/lib/outlets-api');
  return { ...actual, outletsApi: { ...actual.outletsApi, listAccessible: vi.fn() } };
});
vi.mock('@/lib/items-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/items-api')>('@/lib/items-api');
  return { ...actual, itemsApi: { ...actual.itemsApi, list: vi.fn() } };
});

function outlet(overrides: Partial<ApiOutlet> = {}): ApiOutlet {
  return {
    id: 'o1',
    propertyId: 'p1',
    chainId: 'c1',
    name: 'Main Kitchen',
    type: 'KITCHEN',
    baseCurrency: 'SAR',
    isActive: true,
    ...overrides,
  };
}

function item(overrides: Partial<ApiItem> = {}): ApiItem {
  return {
    id: 'i1',
    outletId: 'o1',
    name: 'Basmati Rice',
    categoryId: 'c1',
    sku: 'RICE-001',
    barcode: null,
    unitId: 'u1',
    minStock: '10.000',
    maxStock: '100.000',
    currentStock: '50.000',
    shelfLifeDays: null,
    costPrice: '8.50',
    defaultSupplierId: null,
    purchaseGLAccount: null,
    defaultTaxRateId: null,
    storageLocation: null,
    isActive: true,
    ...overrides,
  };
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function renderScreen() {
  return render(
    <MemoryRouter>
      <NewTransfer />
    </MemoryRouter>,
  );
}

/** Fills line 1 — which the screen seeds by default, so no "Add line" click
 * is needed — with a source item and quantity, waiting for the source
 * outlet's catalogue to actually load before selecting from it. */
async function fillFirstLine(itemValue = 'i1', quantity = '5') {
  const sourceItemSelect = screen.getByLabelText('Item for line 1');
  await within(sourceItemSelect).findByRole('option', { name: /Basmati Rice/ });
  await userEvent.selectOptions(sourceItemSelect, itemValue);
  await userEvent.type(screen.getByLabelText('Quantity for line 1'), quantity);
}

describe('NewTransfer screen', () => {
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
    asMock(outletsApi.listAccessible).mockResolvedValue([
      outlet({ id: 'o1', name: 'Main Kitchen' }),
      outlet({ id: 'o2', name: 'Poolside Bar' }),
    ]);
    asMock(itemsApi.list).mockImplementation(async ({ outletId }: { outletId?: string }) =>
      outletId === 'o1' ? [item({ id: 'i1', name: 'Basmati Rice' })] : [item({ id: 'i2', name: 'Basmati Rice' })],
    );
  });

  it('lists every accessible outlet in both pickers', async () => {
    renderScreen();
    const sourceSelect = (await screen.findByLabelText('From outlet')) as HTMLSelectElement;
    expect([...sourceSelect.options].map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Main Kitchen', 'Poolside Bar']),
    );
  });

  it('excludes the chosen source outlet from the destination picker', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');

    const destSelect = screen.getByLabelText('To outlet') as HTMLSelectElement;
    expect([...destSelect.options].map((o) => o.value)).not.toContain('o1');
    expect([...destSelect.options].map((o) => o.value)).toContain('o2');
  });

  it('seeds one line by default, populated from the chosen source outlet\'s catalogue', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');

    const itemSelect = await screen.findByLabelText('Item for line 1');
    expect(itemSelect).toHaveTextContent('Basmati Rice');
    expect(itemsApi.list).toHaveBeenCalledWith(expect.objectContaining({ outletId: 'o1' }));
  });

  it('shows the destination item picker only once a destination outlet is chosen', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');
    await screen.findByLabelText('Item for line 1');

    expect(screen.queryByLabelText('Destination item for line 1')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('To outlet'), 'o2');
    expect(await screen.findByLabelText('Destination item for line 1')).toBeInTheDocument();
  });

  it('AC (gap-fill): defaults the destination item to auto-detect, not a forced pick', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');
    await userEvent.selectOptions(screen.getByLabelText('To outlet'), 'o2');
    await fillFirstLine();

    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith({
        sourceOutletId: 'o1',
        destOutletId: 'o2',
        lines: [{ itemId: 'i1', quantity: '5', destItemId: undefined }],
      }),
    );
  });

  it('sends an explicit destItemId when the user overrides the auto-detect default', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');
    await userEvent.selectOptions(screen.getByLabelText('To outlet'), 'o2');
    await fillFirstLine();
    await userEvent.selectOptions(await screen.findByLabelText('Destination item for line 1'), 'i2');

    asMock(transfersApi.create).mockResolvedValue({ id: 'new-transfer' });
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ lines: [{ itemId: 'i1', quantity: '5', destItemId: 'i2' }] }),
      ),
    );
    expect(navigateMock).toHaveBeenCalledWith('/transfers/new-transfer');
  });

  it('allows adding a second line, both required before submit is enabled', async () => {
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');
    await userEvent.selectOptions(screen.getByLabelText('To outlet'), 'o2');
    await fillFirstLine();

    await userEvent.click(screen.getByRole('button', { name: 'Add line' }));
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Quantity for line 2'), '1');
    // Line 2 has a quantity but no item chosen — still incomplete.
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });

  it('cannot submit without both outlets chosen', async () => {
    renderScreen();
    await screen.findByLabelText('From outlet');
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });

  it('surfaces the server\'s reason when creation is rejected', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    asMock(transfersApi.create).mockRejectedValue(
      new ApiError(400, '"Truffle Oil" has no matching item at the destination outlet — select one manually.'),
    );
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('From outlet'), 'o1');
    await userEvent.selectOptions(screen.getByLabelText('To outlet'), 'o2');
    await fillFirstLine();

    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no matching item at the destination outlet');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OutletFormModal } from './OutletFormModal';
import { outletsApi, type ApiOutlet } from '@/lib/outlets-api';

vi.mock('@/lib/outlets-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/outlets-api')>('@/lib/outlets-api');
  return { ...actual, outletsApi: { ...actual.outletsApi, create: vi.fn(), update: vi.fn() } };
});

const currencies = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimalPlaces: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimalPlaces: 2 },
];

const existingOutlet: ApiOutlet = {
  id: 'o1',
  propertyId: 'p1',
  chainId: 'c1',
  name: 'Main Restaurant',
  type: 'RESTAURANT',
  baseCurrency: 'SAR',
  poApprovalThreshold: '5000.00',
  isActive: true,
};

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('OutletFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC: creating pre-selects the given default base currency, overridable, and posts to the given property', async () => {
    const onSaved = vi.fn();
    render(
      <OutletFormModal
        open
        outlet={null}
        propertyId="p1"
        currencies={currencies}
        defaultBaseCurrency="SAR"
        onOpenChange={() => {}}
        onSaved={onSaved}
      />,
    );

    expect(screen.getByLabelText('Base currency')).toHaveValue('SAR');
    await userEvent.selectOptions(screen.getByLabelText('Base currency'), 'AED');
    await userEvent.type(screen.getByLabelText('Name'), 'Pool Bar');

    asMock(outletsApi.create).mockResolvedValue({ id: 'o2' });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(outletsApi.create).toHaveBeenCalledWith('p1', {
        name: 'Pool Bar',
        type: 'RESTAURANT',
        baseCurrency: 'AED',
        poApprovalThreshold: undefined,
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('leaves the base currency unselected when no default is known (e.g. a PROPERTY_MANAGER who can\'t read their chain\'s currency)', () => {
    render(
      <OutletFormModal
        open
        outlet={null}
        propertyId="p1"
        currencies={currencies}
        defaultBaseCurrency={undefined}
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByLabelText('Base currency')).toHaveValue('');
  });

  it('AC: editing hides the base-currency field entirely — that goes through the dedicated currency-change flow', async () => {
    render(
      <OutletFormModal
        open
        outlet={existingOutlet}
        propertyId={undefined}
        currencies={currencies}
        defaultBaseCurrency={undefined}
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Main Restaurant');
    expect(screen.getByLabelText('PO approval threshold')).toHaveValue('5000.00');
    expect(screen.queryByLabelText('Base currency')).not.toBeInTheDocument();
  });

  it('AC: editing updates in place without touching baseCurrency', async () => {
    asMock(outletsApi.update).mockResolvedValue(existingOutlet);
    render(
      <OutletFormModal
        open
        outlet={existingOutlet}
        propertyId={undefined}
        currencies={currencies}
        defaultBaseCurrency={undefined}
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    await userEvent.clear(screen.getByLabelText('PO approval threshold'));
    await userEvent.type(screen.getByLabelText('PO approval threshold'), '7500.00');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(outletsApi.update).toHaveBeenCalledWith('o1', {
        name: 'Main Restaurant',
        type: 'RESTAURANT',
        poApprovalThreshold: '7500.00',
      }),
    );
  });
});

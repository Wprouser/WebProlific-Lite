import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Organization } from './Organization';
import { chainsApi, type ApiChainHierarchy } from '@/lib/chains-api';
import { propertiesApi, type ApiPropertyWithOutlets } from '@/lib/properties-api';
import { outletsApi } from '@/lib/outlets-api';
import { currenciesApi, type ApiCurrency } from '@/lib/currencies-api';
import { setSession } from '@/lib/auth-store';

vi.mock('@/lib/chains-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chains-api')>('@/lib/chains-api');
  return { ...actual, chainsApi: { ...actual.chainsApi, getHierarchy: vi.fn(), update: vi.fn() } };
});
vi.mock('@/lib/properties-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/properties-api')>('@/lib/properties-api');
  return { ...actual, propertiesApi: { ...actual.propertiesApi, get: vi.fn(), create: vi.fn(), update: vi.fn() } };
});
vi.mock('@/lib/outlets-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/outlets-api')>('@/lib/outlets-api');
  return {
    ...actual,
    outletsApi: {
      ...actual.outletsApi,
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getCurrencySettings: vi.fn(),
      updateCurrencySettings: vi.fn(),
    },
  };
});
vi.mock('@/lib/currencies-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/currencies-api')>('@/lib/currencies-api');
  return { ...actual, currenciesApi: { ...actual.currenciesApi, list: vi.fn() } };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const currencies: ApiCurrency[] = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimalPlaces: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimalPlaces: 2 },
];

function fixtureHierarchy(overrides: Partial<ApiChainHierarchy> = {}): ApiChainHierarchy {
  return {
    id: 'c1',
    name: 'Al Waha Hospitality Group',
    baseCurrency: 'SAR',
    subscriptionPlan: 'STANDARD',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    properties: [
      {
        id: 'p1',
        name: 'Jeddah Hotel',
        type: 'HOTEL',
        isActive: true,
        outlets: [{ id: 'o1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: true }],
      },
    ],
    ...overrides,
  };
}

function fixtureProperty(overrides: Partial<ApiPropertyWithOutlets> = {}): ApiPropertyWithOutlets {
  return {
    id: 'p1',
    chainId: 'c1',
    name: 'Jeddah Hotel',
    type: 'HOTEL',
    address: null,
    timezone: 'Asia/Riyadh',
    isActive: true,
    outlets: [{ id: 'o1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: true }],
    ...overrides,
  };
}

function sessionAs(effectiveRole: string, chainIds: string[], propertyIds: string[]) {
  setSession({
    accessToken: 'token',
    refreshToken: 'refresh-token',
    user: {
      id: 'u1',
      email: 'test@example.com',
      preferredLanguage: 'en',
      effectiveRole,
      effectiveOutletIds: ['o1'],
      effectivePropertyIds: propertyIds,
      effectiveChainIds: chainIds,
    },
  });
}

describe('Organization screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(currenciesApi.list).mockResolvedValue(currencies);
  });

  describe('CHAIN_OWNER path', () => {
    beforeEach(() => {
      sessionAs('CHAIN_OWNER', ['c1'], []);
      asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    });

    it('AC: shows the chain name and its properties, fetched via the chain hierarchy endpoint', async () => {
      render(<Organization />);
      expect(await screen.findByText(/Al Waha Hospitality Group/)).toBeInTheDocument();
      expect(screen.getByText('Jeddah Hotel')).toBeInTheDocument();
      expect(chainsApi.getHierarchy).toHaveBeenCalledWith('c1');
      expect(propertiesApi.get).not.toHaveBeenCalled();
    });

    it('expands a property to reveal its outlets', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');
      expect(screen.queryByText('Main Restaurant')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /Jeddah Hotel/ }));
      expect(await screen.findByText('Main Restaurant')).toBeInTheDocument();
    });

    it('AC: CHAIN_OWNER can add a property', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');

      await userEvent.click(screen.getByRole('button', { name: 'Add Property' }));
      await userEvent.type(screen.getByLabelText('Name'), 'Riyadh Hotel');

      asMock(propertiesApi.create).mockResolvedValue({ id: 'p2' });
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(propertiesApi.create).toHaveBeenCalledWith(
          'c1',
          expect.objectContaining({ name: 'Riyadh Hotel', type: 'HOTEL' }),
        ),
      );
    });

    it('AC: CHAIN_OWNER can add an outlet to any property', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');

      await userEvent.click(screen.getByRole('button', { name: 'Add Outlet' }));
      await userEvent.type(screen.getByLabelText('Name'), 'Pool Bar');

      asMock(outletsApi.create).mockResolvedValue({ id: 'o2' });
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(outletsApi.create).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Pool Bar' })),
      );
    });

    it('AC: deactivating a property names the outlet-count cascade before confirming', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');

      await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
      expect(
        await screen.findByText(/Deactivate "Jeddah Hotel"\? This will also deactivate all 1 outlet\(s\)/),
      ).toBeInTheDocument();

      asMock(propertiesApi.update).mockResolvedValue({ id: 'p1', isActive: false });
      await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));

      await waitFor(() => expect(propertiesApi.update).toHaveBeenCalledWith('p1', { isActive: false }));
    });

    it('fetches the full property before opening the edit modal (summary data lacks address/timezone)', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');

      asMock(propertiesApi.get).mockResolvedValue(fixtureProperty({ address: '123 Corniche Rd' }));
      await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

      expect(propertiesApi.get).toHaveBeenCalledWith('p1');
      expect(await screen.findByDisplayValue('123 Corniche Rd')).toBeInTheDocument();
    });

    it('lets a CHAIN_OWNER change an outlet\'s currency via the existing currency-change flow', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');
      await userEvent.click(screen.getByRole('button', { name: /Jeddah Hotel/ }));
      await screen.findByText('Main Restaurant');

      asMock(outletsApi.getCurrencySettings).mockResolvedValue({ baseCurrency: 'SAR', supportedCurrencies: ['SAR', 'AED'] });
      await userEvent.click(screen.getByRole('button', { name: 'Change currency' }));

      expect(outletsApi.getCurrencySettings).toHaveBeenCalledWith('o1');
      expect(await screen.findByText('Change base currency')).toBeInTheDocument();
    });

    it('shows an empty state when the chain has no properties yet, with the header\'s Add Property button still reachable', async () => {
      asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy({ properties: [] }));
      render(<Organization />);
      expect(await screen.findByText('No properties yet')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Add Property' })).toHaveLength(1);
    });
  });

  describe('PROPERTY_MANAGER path (no chain-level access)', () => {
    beforeEach(() => {
      sessionAs('PROPERTY_MANAGER', [], ['p1']);
      asMock(propertiesApi.get).mockResolvedValue(fixtureProperty());
    });

    it('AC: loads via GET /properties/:id per accessible property, not the chain hierarchy endpoint', async () => {
      render(<Organization />);
      expect(await screen.findByText('Jeddah Hotel')).toBeInTheDocument();
      expect(propertiesApi.get).toHaveBeenCalledWith('p1');
      expect(chainsApi.getHierarchy).not.toHaveBeenCalled();
    });

    it('AC: shows no chain name — a PROPERTY_MANAGER has no endpoint that can resolve it', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');
      expect(screen.queryByText(/Al Waha/)).not.toBeInTheDocument();
    });

    it('AC: cannot add a new Property', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');
      expect(screen.queryByRole('button', { name: 'Add Property' })).not.toBeInTheDocument();
    });

    it('AC: can add an outlet within their own property', async () => {
      render(<Organization />);
      await screen.findByText('Jeddah Hotel');
      expect(screen.getByRole('button', { name: 'Add Outlet' })).toBeInTheDocument();
    });
  });

  describe('a role with neither a CHAIN nor a PROPERTY grant', () => {
    it('renders an empty structure, driven by the same access data the server enforces on', async () => {
      sessionAs('OUTLET_MANAGER', [], []);
      render(<Organization />);
      expect(await screen.findByText('No properties yet')).toBeInTheDocument();
      expect(chainsApi.getHierarchy).not.toHaveBeenCalled();
      expect(propertiesApi.get).not.toHaveBeenCalled();
    });
  });
});

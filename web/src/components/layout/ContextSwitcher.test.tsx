import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ContextSwitcher } from './ContextSwitcher';
import { chainsApi, type ApiChainHierarchy } from '@/lib/chains-api';
import { propertiesApi, type ApiPropertyWithOutlets } from '@/lib/properties-api';
import { outletsApi, type ApiOutletWithHierarchyNames } from '@/lib/outlets-api';
import { setSession } from '@/lib/auth-store';
import { clearSelectedContext, getSelectedContext } from '@/lib/selected-context-store';
import { setUnsavedWork, clearUnsavedWork } from '@/lib/unsaved-work-registry';

vi.mock('@/lib/chains-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chains-api')>('@/lib/chains-api');
  return { ...actual, chainsApi: { ...actual.chainsApi, getHierarchy: vi.fn() } };
});
vi.mock('@/lib/properties-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/properties-api')>('@/lib/properties-api');
  return { ...actual, propertiesApi: { ...actual.propertiesApi, get: vi.fn() } };
});
vi.mock('@/lib/outlets-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/outlets-api')>('@/lib/outlets-api');
  return { ...actual, outletsApi: { ...actual.outletsApi, listAccessible: vi.fn() } };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function sessionAs(
  effectiveRole: string,
  { chainIds = [], propertyIds = [], outletIds = ['o1'] }: { chainIds?: string[]; propertyIds?: string[]; outletIds?: string[] },
) {
  setSession({
    accessToken: 'token',
    refreshToken: 'refresh-token',
    user: {
      id: 'u1',
      email: 'test@example.com',
      preferredLanguage: 'en',
      effectiveRole,
      effectiveOutletIds: outletIds,
      effectivePropertyIds: propertyIds,
      effectiveChainIds: chainIds,
    },
  });
}

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
        outlets: [
          { id: 'o1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: true },
          { id: 'o2', name: 'Pool Bar', type: 'BAR', isActive: true },
        ],
      },
      {
        id: 'p2',
        name: 'Riyadh Hotel',
        type: 'HOTEL',
        isActive: true,
        outlets: [{ id: 'o3', name: 'Main Kitchen', type: 'KITCHEN', isActive: true }],
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

// Both responsive layouts (desktop breadcrumb, mobile compact trigger)
// render simultaneously in the DOM, hidden/shown purely via CSS — so
// property/outlet name text exists twice at once. Scoped to the desktop
// nav, the one CSS-independent region, to avoid "multiple elements" noise.
function desktopNav() {
  return within(screen.getByRole('navigation', { name: 'Chain, property, and outlet context' }));
}

describe('ContextSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSelectedContext();
    clearUnsavedWork();
  });

  it('AC: CHAIN_OWNER path shows the chain name, defaulting to the caller\'s own outlet', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o3'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    expect(await screen.findByText('Al Waha Hospitality Group')).toBeInTheDocument();
    // Defaults to o3's own property (Riyadh Hotel), not the first one listed.
    expect(desktopNav().getByText('Riyadh Hotel')).toBeInTheDocument();
    expect(desktopNav().getByText('Main Kitchen')).toBeInTheDocument();
    expect(chainsApi.getHierarchy).toHaveBeenCalledWith('c1');
  });

  it('AC: PROPERTY_MANAGER path shows no chain name at all', async () => {
    sessionAs('PROPERTY_MANAGER', { propertyIds: ['p1'] });
    asMock(propertiesApi.get).mockResolvedValue(fixtureProperty());
    render(<ContextSwitcher />);

    expect(await screen.findByText('Jeddah Hotel')).toBeInTheDocument();
    expect(screen.queryByText(/Al Waha/)).not.toBeInTheDocument();
    expect(propertiesApi.get).toHaveBeenCalledWith('p1');
    expect(chainsApi.getHierarchy).not.toHaveBeenCalled();
  });

  it('AC: an OUTLET-only grant (OUTLET_MANAGER/STORE_STAFF/CHEF) falls back to GET /outlets, grouped by property', async () => {
    sessionAs('STORE_STAFF', { outletIds: ['o1'] });
    const outlets: ApiOutletWithHierarchyNames[] = [
      {
        id: 'o1',
        propertyId: 'p1',
        chainId: 'c1',
        name: 'Main Restaurant',
        type: 'RESTAURANT',
        baseCurrency: 'SAR',
        poApprovalThreshold: null,
        isActive: true,
        propertyName: 'Jeddah Hotel',
        chainName: 'Al Waha Hospitality Group',
      },
    ];
    asMock(outletsApi.listAccessible).mockResolvedValue(outlets);
    render(<ContextSwitcher />);

    expect(await screen.findByText('Al Waha Hospitality Group')).toBeInTheDocument();
    expect(desktopNav().getByText('Jeddah Hotel')).toBeInTheDocument();
    expect(desktopNav().getByText('Main Restaurant')).toBeInTheDocument();
    expect(chainsApi.getHierarchy).not.toHaveBeenCalled();
    expect(propertiesApi.get).not.toHaveBeenCalled();
  });

  it('shows plain text (no dropdown) when there is only one property and one outlet', async () => {
    sessionAs('OUTLET_MANAGER', { propertyIds: ['p1'] });
    asMock(propertiesApi.get).mockResolvedValue(fixtureProperty());
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    expect(screen.queryByRole('button', { name: 'Jeddah Hotel' })).not.toBeInTheDocument();
  });

  it('AC: switching property auto-selects its first outlet (tablet+ breadcrumb)', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Jeddah Hotel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Riyadh Hotel' }));

    expect(await desktopNav().findByText('Main Kitchen')).toBeInTheDocument();
  });

  it('shows a neutral empty state for a role with no organization access at all', async () => {
    sessionAs('OUTLET_MANAGER', { outletIds: [] });
    asMock(outletsApi.listAccessible).mockResolvedValue([]);
    render(<ContextSwitcher />);
    expect(await screen.findByText('No organization access yet')).toBeInTheDocument();
  });

  it('AC: persists the selection so other screens (useSelectedContext) see it', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Main Restaurant' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pool Bar' }));

    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o2', propertyId: 'p1' });
  });

  it('AC: establishes a persisted default on first load, even with no user interaction', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o3'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    await screen.findByText('Riyadh Hotel');
    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o3', propertyId: 'p2' });
  });

  it('AC: repairs a stale persisted selection (an outlet that no longer exists) rather than getting stuck', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    localStorage.setItem(
      'webprolific.selectedContext',
      JSON.stringify({ level: 'outlet', outletId: 'ghost-outlet', propertyId: 'ghost-property' }),
    );
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o1', propertyId: 'p1' });
  });

  it('AC: a CHAIN_OWNER/PROPERTY_MANAGER can select "view entire property"', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Main Restaurant' }));
    await userEvent.click(screen.getByRole('button', { name: 'View entire property' }));

    expect(await desktopNav().findByText('All outlets')).toBeInTheDocument();
    expect(getSelectedContext()).toEqual({ level: 'property', outletId: 'o1', propertyId: 'p1' });
  });

  it('does not offer "view entire property" for a role below PROPERTY_MANAGER', async () => {
    sessionAs('STORE_STAFF', { outletIds: ['o1'] });
    const outlets: ApiOutletWithHierarchyNames[] = [
      { id: 'o1', propertyId: 'p1', chainId: 'c1', name: 'Main Restaurant', type: 'RESTAURANT', baseCurrency: 'SAR', poApprovalThreshold: null, isActive: true, propertyName: 'Jeddah Hotel', chainName: 'Al Waha Hospitality Group' },
      { id: 'o2', propertyId: 'p1', chainId: 'c1', name: 'Pool Bar', type: 'BAR', baseCurrency: 'SAR', poApprovalThreshold: null, isActive: true, propertyName: 'Jeddah Hotel', chainName: 'Al Waha Hospitality Group' },
    ];
    asMock(outletsApi.listAccessible).mockResolvedValue(outlets);
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Main Restaurant' }));
    expect(screen.queryByRole('button', { name: 'View entire property' })).not.toBeInTheDocument();
  });

  it('AC: switching outlet while unsaved work is registered asks for confirmation first', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    setUnsavedWork('New Transfer');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Main Restaurant' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pool Bar' }));

    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes in New Transfer. Discard them and continue?');
    // Declined — the selection must not have changed.
    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o1', propertyId: 'p1' });
    confirmSpy.mockRestore();
  });

  it('AC: confirming the prompt lets the switch through', async () => {
    sessionAs('CHAIN_OWNER', { chainIds: ['c1'], outletIds: ['o1'] });
    asMock(chainsApi.getHierarchy).mockResolvedValue(fixtureHierarchy());
    setUnsavedWork('New Transfer');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ContextSwitcher />);

    await screen.findByText('Jeddah Hotel');
    await userEvent.click(desktopNav().getByRole('button', { name: 'Main Restaurant' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pool Bar' }));

    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o2', propertyId: 'p1' });
    confirmSpy.mockRestore();
  });
});

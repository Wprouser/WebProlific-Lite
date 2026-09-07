import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { dashboardApi, type ApiOutletDashboard, type ApiPropertyDashboard } from '@/lib/dashboard-api';
import { setSession } from '@/lib/auth-store';
import { clearSelectedContext, setSelectedContext } from '@/lib/selected-context-store';

vi.mock('@/lib/dashboard-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/dashboard-api')>('@/lib/dashboard-api');
  return { ...actual, dashboardApi: { ...actual.dashboardApi, getOutlet: vi.fn(), getProperty: vi.fn() } };
});

function fixtureDashboard(overrides: Partial<ApiOutletDashboard> = {}): ApiOutletDashboard {
  return {
    outletId: 'o1',
    outletName: 'Main Restaurant',
    activeItemCount: 482,
    stockValuation: '128940.00',
    currency: 'SAR',
    isConverted: false,
    openLowStockAlerts: 3,
    pendingPoApprovals: 2,
    transfersInTransit: 1,
    ...overrides,
  };
}

function fixturePropertyDashboard(overrides: Partial<ApiPropertyDashboard> = {}): ApiPropertyDashboard {
  return {
    propertyId: 'p1',
    propertyName: 'Jeddah Hotel',
    outletCount: 2,
    activeItemCount: 900,
    stockValuation: '250000.00',
    currency: 'SAR',
    isConverted: false,
    openLowStockAlerts: 5,
    pendingPoApprovals: 3,
    transfersInTransit: 2,
    ...overrides,
  };
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('Dashboard screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSelectedContext();
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
    asMock(dashboardApi.getOutlet).mockResolvedValue(fixtureDashboard());
  });

  it('shows the outlet name and all five real metrics', async () => {
    render(<Dashboard />);
    expect(await screen.findByText(/Main Restaurant/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // openLowStockAlerts
    expect(screen.getByText('482')).toBeInTheDocument(); // activeItemCount
    expect(screen.getByText('SAR 128,940.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // pendingPoApprovals
    expect(screen.getByText('1')).toBeInTheDocument(); // transfersInTransit
    expect(dashboardApi.getOutlet).toHaveBeenCalledWith('o1');
  });

  it('AC: labels the valuation as FX-converted when isConverted is true', async () => {
    asMock(dashboardApi.getOutlet).mockResolvedValue(fixtureDashboard({ isConverted: true, currency: 'SAR' }));
    render(<Dashboard />);
    expect(await screen.findByText('Converted to SAR')).toBeInTheDocument();
  });

  it('does not show a converted note when isConverted is false', async () => {
    render(<Dashboard />);
    await screen.findByText(/Main Restaurant/);
    expect(screen.queryByText(/Converted to/)).not.toBeInTheDocument();
  });

  it('surfaces the server\'s reason when the dashboard fails to load, with a retry', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    asMock(dashboardApi.getOutlet).mockRejectedValue(new ApiError(500, 'Something went wrong upstream'));
    render(<Dashboard />);
    expect(await screen.findByText('Something went wrong upstream')).toBeInTheDocument();

    asMock(dashboardApi.getOutlet).mockResolvedValue(fixtureDashboard());
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/Main Restaurant/)).toBeInTheDocument();
  });

  it('AC: respects the Context Switcher\'s selection instead of an independent default', async () => {
    setSelectedContext({ level: 'outlet', outletId: 'o2', propertyId: 'p1' });
    asMock(dashboardApi.getOutlet).mockResolvedValue(fixtureDashboard({ outletId: 'o2', outletName: 'Pool Bar' }));
    render(<Dashboard />);
    expect(await screen.findByText(/Pool Bar/)).toBeInTheDocument();
    expect(dashboardApi.getOutlet).toHaveBeenCalledWith('o2');
  });

  it('AC: a "view entire property" selection calls the property dashboard instead', async () => {
    setSelectedContext({ level: 'property', outletId: 'o1', propertyId: 'p1' });
    asMock(dashboardApi.getProperty).mockResolvedValue(fixturePropertyDashboard());
    render(<Dashboard />);

    expect(await screen.findByText(/Jeddah Hotel/)).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument(); // activeItemCount
    expect(dashboardApi.getProperty).toHaveBeenCalledWith('p1');
    expect(dashboardApi.getOutlet).not.toHaveBeenCalled();
  });

  it('AC: switching context while mounted refetches live, without navigating away', async () => {
    render(<Dashboard />);
    await screen.findByText(/Main Restaurant/);

    asMock(dashboardApi.getOutlet).mockResolvedValue(fixtureDashboard({ outletId: 'o2', outletName: 'Pool Bar' }));
    setSelectedContext({ level: 'outlet', outletId: 'o2', propertyId: 'p1' });

    expect(await screen.findByText(/Pool Bar/)).toBeInTheDocument();
  });
});

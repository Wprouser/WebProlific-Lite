import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GrnDetail } from './GrnDetail';
import { grnApi, type ApiGrn } from '@/lib/grn-api';
import { suppliersApi } from '@/lib/suppliers-api';
import { itemsApi } from '@/lib/items-api';
import { setSession } from '@/lib/auth-store';

vi.mock('@/lib/grn-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/grn-api')>('@/lib/grn-api');
  return {
    ...actual,
    grnApi: { ...actual.grnApi, get: vi.fn(), getPdf: vi.fn(), sendEmail: vi.fn(), post: vi.fn() },
  };
});
vi.mock('@/lib/suppliers-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/suppliers-api')>('@/lib/suppliers-api');
  return { ...actual, suppliersApi: { ...actual.suppliersApi, get: vi.fn() } };
});
vi.mock('@/lib/items-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/items-api')>('@/lib/items-api');
  return { ...actual, itemsApi: { ...actual.itemsApi, list: vi.fn() } };
});
vi.mock('@/lib/pdf-utils', () => ({ openPdfBlob: vi.fn() }));

const baseGrn: ApiGrn = {
  id: 'g1',
  outletId: 'o1',
  purchaseOrderId: null,
  supplierId: 's1',
  status: 'POSTED',
  createdById: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  postedById: 'u1',
  postedAt: '2026-01-01T00:05:00.000Z',
  currencyCode: 'SAR',
  exchangeRateToBase: '1',
  isTaxInclusive: false,
  discountAmount: '0.00',
  otherChargesAmount: '0.00',
  subtotal: '460.00',
  taxAmount: '69.00',
  totalValue: '529.00',
  invoiceNumber: null,
  invoiceScanUrl: null,
  invoiceScanStatus: null,
  varianceFlagged: false,
  lines: [],
  lastEmailedAt: null,
  lastEmailedTo: null,
};

const draftLine = {
  id: 'gl1',
  grnId: 'g1',
  itemId: 'i1',
  orderedQty: null,
  receivedQty: '5.000',
  actualPrice: '92.00',
  taxRateId: null,
  taxRate: '0.00',
  lineSubtotal: '460.00',
  lineTaxAmount: '0.00',
  lineTotal: '460.00',
  taxComponents: [],
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/grn/g1']}>
      <Routes>
        <Route path="/grn/:id" element={<GrnDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GrnDetail screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession({
      accessToken: 'token',
      refreshToken: 'refresh-token',
      user: { id: 'u1', email: 'test@example.com', preferredLanguage: 'en', effectiveRole: 'OUTLET_MANAGER', effectiveOutletIds: ['o1'], effectivePropertyIds: [], effectiveChainIds: [] },
    });
    (suppliersApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 's1', name: 'Al-Fahad Trading', email: 'supplier@example.com' });
    (itemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('shows a Direct badge for a GRN with no linked PO', async () => {
    (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseGrn);
    renderScreen();
    expect(await screen.findByText('Al-Fahad Trading')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('shows an Against PO badge and a Variance badge when applicable', async () => {
    (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseGrn,
      purchaseOrderId: 'po1',
      varianceFlagged: true,
    });
    renderScreen();
    await screen.findByText('Al-Fahad Trading');
    expect(screen.getByText('Against PO')).toBeInTheDocument();
    expect(screen.getByText('Variance')).toBeInTheDocument();
  });

  it('Print downloads/opens the real generated PDF', async () => {
    const { openPdfBlob } = await import('@/lib/pdf-utils');
    const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseGrn);
    (grnApi.getPdf as ReturnType<typeof vi.fn>).mockResolvedValue(blob);
    renderScreen();
    await screen.findByText('Al-Fahad Trading');

    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    await vi.waitFor(() => expect(grnApi.getPdf).toHaveBeenCalledWith('g1'));
    expect(openPdfBlob).toHaveBeenCalledWith(blob);
  });

  it('emailing updates the Last Sent display on success', async () => {
    (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseGrn);
    (grnApi.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseGrn,
      lastEmailedAt: '2026-07-21T15:40:00.000Z',
      lastEmailedTo: 'supplier@example.com',
    });
    renderScreen();
    await screen.findByText('Al-Fahad Trading');

    await userEvent.click(screen.getByRole('button', { name: 'Email' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await vi.waitFor(() => expect(grnApi.sendEmail).toHaveBeenCalledWith('g1', expect.anything()));
    expect(await screen.findByText(/supplier@example\.com/)).toBeInTheDocument();
  });

  describe('DRAFT lifecycle', () => {
    it('AC: shows the Inventory Impact preview and a Post Received Items action for a DRAFT GRN', async () => {
      (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseGrn,
        status: 'DRAFT',
        postedById: null,
        postedAt: null,
        lines: [draftLine],
      });
      renderScreen();
      await screen.findByText('Al-Fahad Trading');

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Inventory Impact Preview')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Post Received Items' })).toBeInTheDocument();
    });

    it('AC: posting calls the post endpoint and reflects the resulting POSTED status', async () => {
      (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseGrn,
        status: 'DRAFT',
        postedById: null,
        postedAt: null,
        lines: [draftLine],
      });
      (grnApi.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseGrn,
        status: 'POSTED',
        lines: [draftLine],
      });
      renderScreen();
      await screen.findByText('Al-Fahad Trading');

      await userEvent.click(screen.getByRole('button', { name: 'Post Received Items' }));
      await vi.waitFor(() => expect(grnApi.post).toHaveBeenCalledWith('g1'));
      expect(await screen.findByText('Posted')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Post Received Items' })).not.toBeInTheDocument();
    });

    it('hides the post action (shows an approval-needed note instead) for a variance-flagged draft when the role cannot override it', async () => {
      setSession({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        user: { id: 'u1', email: 'test@example.com', preferredLanguage: 'en', effectiveRole: 'STORE_STAFF', effectiveOutletIds: ['o1'], effectivePropertyIds: [], effectiveChainIds: [] },
      });
      (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseGrn,
        status: 'DRAFT',
        postedById: null,
        postedAt: null,
        varianceFlagged: true,
        lines: [draftLine],
      });
      renderScreen();
      await screen.findByText('Al-Fahad Trading');

      expect(screen.queryByRole('button', { name: 'Post Received Items' })).not.toBeInTheDocument();
      expect(
        screen.getByText('This GRN has a quantity variance and needs manager approval before it can be posted.'),
      ).toBeInTheDocument();
    });

    it('surfaces the server error when posting fails', async () => {
      const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
      (grnApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseGrn,
        status: 'DRAFT',
        postedById: null,
        postedAt: null,
        lines: [draftLine],
      });
      (grnApi.post as ReturnType<typeof vi.fn>).mockRejectedValue(new ApiError(409, 'GRN has already been posted'));
      renderScreen();
      await screen.findByText('Al-Fahad Trading');

      await userEvent.click(screen.getByRole('button', { name: 'Post Received Items' }));
      expect(await screen.findByText('GRN has already been posted')).toBeInTheDocument();
    });
  });
});

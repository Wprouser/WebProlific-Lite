import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PropertyFormModal } from './PropertyFormModal';
import { propertiesApi, type ApiPropertyWithOutlets } from '@/lib/properties-api';

vi.mock('@/lib/properties-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/properties-api')>('@/lib/properties-api');
  return { ...actual, propertiesApi: { ...actual.propertiesApi, create: vi.fn(), update: vi.fn() } };
});

const existingProperty: ApiPropertyWithOutlets = {
  id: 'p1',
  chainId: 'c1',
  name: 'Jeddah Hotel',
  type: 'HOTEL',
  address: '123 Corniche Rd',
  timezone: 'Asia/Riyadh',
  isActive: true,
  outlets: [],
};

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('PropertyFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC: creating sends the new property to the given chain', async () => {
    const onSaved = vi.fn();
    render(<PropertyFormModal open property={null} chainId="c1" onOpenChange={() => {}} onSaved={onSaved} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Riyadh Hotel');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'STANDALONE_RESTAURANT');
    await userEvent.type(screen.getByLabelText('Address'), '456 King Fahd Rd');

    asMock(propertiesApi.create).mockResolvedValue({ id: 'p2' });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(propertiesApi.create).toHaveBeenCalledWith('c1', {
        name: 'Riyadh Hotel',
        type: 'STANDALONE_RESTAURANT',
        address: '456 King Fahd Rd',
        timezone: undefined,
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('AC: editing pre-fills every field and updates in place, without a chainId', async () => {
    render(
      <PropertyFormModal open property={existingProperty} chainId={undefined} onOpenChange={() => {}} onSaved={() => {}} />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Jeddah Hotel');
    expect(screen.getByLabelText('Address')).toHaveValue('123 Corniche Rd');
    expect(screen.getByLabelText('Timezone')).toHaveValue('Asia/Riyadh');

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Jeddah Grand Hotel');

    asMock(propertiesApi.update).mockResolvedValue(existingProperty);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(propertiesApi.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'Jeddah Grand Hotel' }),
      ),
    );
  });

  it('surfaces the server\'s reason when the save is rejected', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    asMock(propertiesApi.create).mockRejectedValue(new ApiError(400, 'A property with this name already exists'));
    render(<PropertyFormModal open property={null} chainId="c1" onOpenChange={() => {}} onSaved={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Riyadh Hotel');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('A property with this name already exists')).toBeInTheDocument();
  });
});

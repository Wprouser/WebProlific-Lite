import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from './Modal';

function ControlledModal() {
  const [open, setOpen] = useState(true);
  return (
    <Modal open={open} onOpenChange={setOpen} title="Confirm deactivation" description="Reversible later.">
      <p>Body content</p>
    </Modal>
  );
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onOpenChange={vi.fn()} title="Hidden" />);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders title, description, and children when open', () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="Confirm deactivation" description="Reversible later.">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByText('Confirm deactivation')).toBeInTheDocument();
    expect(screen.getByText('Reversible later.')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('closes via the close button, calling onOpenChange', async () => {
    render(<ControlledModal />);
    expect(screen.getByText('Confirm deactivation')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Confirm deactivation')).not.toBeInTheDocument();
  });
});

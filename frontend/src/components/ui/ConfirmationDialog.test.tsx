import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('renders dialog content when open', () => {
    render(
      <ConfirmationDialog
        open
        onOpenChange={vi.fn()}
        title="Delete artifact"
        description="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete artifact')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls confirm and close handlers', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        open
        onOpenChange={onOpenChange}
        title="Delete artifact"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables dismissal when loading', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        open
        onOpenChange={onOpenChange}
        title="Delete artifact"
        description="This cannot be undone."
        isLoading
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close confirmation' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Working...' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

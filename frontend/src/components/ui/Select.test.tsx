import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformSelect } from './Select';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false) as any;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn() as any;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn() as any;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn() as any;
  }
});

describe('PlatformSelect', () => {
  const options = [
    { value: 'alpha', label: 'Alpha' },
    { value: 'beta', label: 'Beta', disabled: true },
  ];

  it('shows placeholder and updates selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<PlatformSelect placeholder="Choose one" options={options} onValueChange={onValueChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Alpha'));

    expect(onValueChange).toHaveBeenCalledWith('alpha');
  });

  it('respects disabled state', async () => {
    const user = userEvent.setup();
    render(<PlatformSelect placeholder="Choose one" options={options} disabled />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('option', { name: 'Alpha' })).not.toBeInTheDocument();
  });

  it('filters searchable options and shows no-results text', async () => {
    const user = userEvent.setup();
    render(<PlatformSelect placeholder="Choose one" searchable searchPlaceholder="Search" noResultsText="Nothing" options={options} />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Search'), 'zz');

    expect(await screen.findByText('Nothing')).toBeInTheDocument();
  });
});

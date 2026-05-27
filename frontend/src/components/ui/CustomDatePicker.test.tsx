import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomDatePicker } from './CustomDatePicker';

describe('CustomDatePicker', () => {
  it('renders the current value', () => {
    render(<CustomDatePicker value="2026-05-27" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /2026-05-27/i })).toBeInTheDocument();
  });

  it('opens and clears a selected date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomDatePicker value="2026-05-27" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /2026-05-27/i }));
    await user.click(screen.getByRole('button', { name: /Clear/i }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('selects Today and forwards a formatted date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomDatePicker value="" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /YYYY-MM-DD/i }));
    await user.click(await screen.findByRole('button', { name: /Today/i }));

    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('selects a calendar day', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomDatePicker value="2026-05-10" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /2026-05-10/i }));
    await user.click(await screen.findByRole('button', { name: '15' }));

    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/));
  });
});

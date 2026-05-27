import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('shows content on hover', async () => {
    render(<Tooltip content={<span>Help</span>}><button>Hover me</button></Tooltip>);
    const btn = screen.getByRole('button', { name: /hover me/i });
    await userEvent.hover(btn);
    expect(await screen.findByRole('tooltip')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toContain('Help');
    await userEvent.unhover(btn);
  });
});

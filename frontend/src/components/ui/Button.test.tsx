import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and responds to click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it('disabled prevents click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: /disabled/i });
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

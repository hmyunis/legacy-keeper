import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState } from 'react';
import { useDebouncedValue } from './debounce';

function DebounceTester({ delay = 200 }: { delay?: number }) {
  const [value, setValue] = useState('a');
  const debounced = useDebouncedValue(value, delay);
  return (
    <div>
      <div data-testid="debounced">{debounced}</div>
      <button onClick={() => setValue('b')}>set-b</button>
      <button onClick={() => setValue('c')}>set-c</button>
    </div>
  );
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays updates and only applies last call', async () => {
    render(<DebounceTester delay={1000} />);
    const deb = screen.getByTestId('debounced');
    expect(deb.textContent).toBe('a');

    const btn = screen.getByText('set-b');
    const btn2 = screen.getByText('set-c');

    act(() => {
      btn.click();
      btn2.click();
    });

    // still original
    expect(deb.textContent).toBe('a');

    // advance past the debounce delay
    await act(async () => {
      vi.advanceTimersByTime(1000);
      // let React process effects
      await Promise.resolve();
    });

    expect(deb.textContent).toBe('c');
  });
});

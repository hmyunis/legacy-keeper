import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TornEdge } from './TornEdge';

describe('TornEdge', () => {
  it('renders an aria-hidden decorative separator', () => {
    const { container } = render(<TornEdge />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('switches fill color by direction', () => {
    const { container, rerender } = render(<TornEdge direction="dark-to-light" />);
    expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--clr-charcoal)');

    rerender(<TornEdge direction="light-to-dark" />);
    expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--clr-parchment)');
  });
});

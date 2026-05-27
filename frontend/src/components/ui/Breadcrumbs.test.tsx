import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

const routerState = vi.hoisted(() => ({ pathname: '/dashboard/vault/123' }));

vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => routerState.pathname,
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

describe('Breadcrumbs', () => {
  it('renders mapped breadcrumb labels and skips numeric ids', () => {
    render(<Breadcrumbs />);

    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('Great Hall')).toBeInTheDocument();
    expect(screen.getByText('Memory Vault')).toBeInTheDocument();
    expect(screen.queryByText('123')).not.toBeInTheDocument();
  });

  it('returns null for root path', () => {
    routerState.pathname = '/';
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });
});

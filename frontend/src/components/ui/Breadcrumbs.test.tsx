import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';

const routerState = vi.hoisted(() => ({ pathname: '/dashboard/vault/123' }));

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: routerState.pathname } }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Breadcrumbs', () => {
  it('renders mapped breadcrumb labels and skips numeric ids', () => {
    render(<Breadcrumbs /> as React.ReactElement);

    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('Great Hall')).toBeInTheDocument();
    expect(screen.getByText('Memory Vault')).toBeInTheDocument();
    expect(screen.queryByText('123')).not.toBeInTheDocument();
  });

  it('returns null for root path', () => {
    routerState.pathname = '/';
    const { container } = render(<Breadcrumbs /> as React.ReactElement);
    expect(container.firstChild).toBeNull();
  });
});

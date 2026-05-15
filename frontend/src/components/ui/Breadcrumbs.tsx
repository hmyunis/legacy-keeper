import { Link, useRouterState } from '@tanstack/react-router';
import { CaretRight, HouseLine } from '@phosphor-icons/react';

const ROUTE_MAP: Record<string, string> = {
  dashboard: 'Great Hall',
  vault: 'Memory Vault',
  tree: 'Living Lineage',
  timeline: 'Chronology',
  capsules: 'Time Capsules',
  search: 'Curator Desk',
  members: 'Governance',
  settings: 'Curator Settings',
  logs: 'Registry',
  help: 'Guidebook',
  person: 'Identity Profile'
};

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0 || pathname === '/') return null;

  return (
    <nav className="flex items-center gap-3 px-[clamp(24px,5vw,80px)] py-6 bg-transparent relative z-20">
      <Link
        to="/dashboard"
        className="text-[var(--clr-gold)] hover:text-[var(--clr-gold-light)] transition-colors flex items-center gap-1.5"
      >
        <HouseLine size={16} weight="fill" />
        <span className="font-ui text-[10px] font-bold uppercase tracking-widest">Museum</span>
      </Link>

      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        const label = ROUTE_MAP[part] || part;

        if (!isNaN(Number(part))) return null;

        return (
          <div key={part} className="flex items-center gap-3">
            <CaretRight size={10} className="text-[var(--clr-aged)]" weight="bold" />
            <span className={`font-ui text-[10px] font-bold uppercase tracking-widest ${
              isLast ? 'text-[var(--clr-dust)] cursor-default' : 'text-[var(--clr-gold)] hover:text-[var(--clr-gold-light)] cursor-pointer'
            }`}>
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

import type { FC } from 'react';
import { Link } from '@tanstack/react-router';

export const AuthMobileBrand: FC = () => (
  <Link to="/" className="lg:hidden flex items-center gap-3 mb-4 transition-opacity hover:opacity-80">
    <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black shadow-lg">L</div>
    <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tighter">LegacyKeeper</span>
  </Link>
);

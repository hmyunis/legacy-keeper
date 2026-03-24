import type { FC } from 'react';
import { getCurrentYear } from '@/features/landing/selectors';

export const LandingFooter: FC = () => (
  <footer className="py-10 sm:py-12 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg">L</div>
        <span className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">LegacyKeeper</span>
      </div>
      <p className="text-xs sm:text-sm text-slate-500">© {getCurrentYear()} LegacyKeeper. All rights reserved.</p>
      <div className="flex gap-4 sm:gap-6">
        <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Privacy</button>
        <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Security</button>
      </div>
    </div>
  </footer>
);

import type { FC } from 'react';
import { ShieldCheck } from 'lucide-react';

export const AuthSecurityBadge: FC = () => (
  <div className="text-center">
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
      <ShieldCheck size={14} /> Secure & Protected
    </div>
  </div>
);

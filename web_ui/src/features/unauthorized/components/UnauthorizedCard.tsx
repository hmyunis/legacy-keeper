import type { FC } from 'react';
import { ShieldAlert } from 'lucide-react';

interface UnauthorizedCardProps {
  title: string;
  description: string;
  attemptedRouteLabel: string;
  attemptedPath: string | null;
}

export const UnauthorizedCard: FC<UnauthorizedCardProps> = ({
  title,
  description,
  attemptedRouteLabel,
  attemptedPath,
}) => (
  <div className="flex items-start gap-4">
    <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
      <ShieldAlert size={24} />
    </div>
    <div>
      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{description}</p>
      {attemptedPath && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {attemptedRouteLabel}: <span className="font-mono">{attemptedPath}</span>
        </p>
      )}
    </div>
  </div>
);

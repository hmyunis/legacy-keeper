import type { FC } from 'react';
import { Link } from '@tanstack/react-router';

export const AuthMarketingPanel: FC = () => (
  <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 bg-primary text-white relative">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
    <div className="relative z-10">
      <Link to="/" className="flex items-center gap-3 mb-16 transition-opacity hover:opacity-80">
        <div className="w-12 h-12 bg-white text-primary rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl">L</div>
        <span className="font-bold text-2xl tracking-tighter">LegacyKeeper</span>
      </Link>
      <div className="max-w-md space-y-6">
        <h1 className="text-6xl font-black leading-tight tracking-tighter">Safeguard your family&apos;s future today.</h1>
        <p className="text-white/90 text-lg leading-relaxed italic opacity-80 border-l-4 border-white/30 pl-6">
          Keep your family's precious memories safe and secure. Sign in to access your private digital vault.
        </p>
      </div>
    </div>
  </div>
);

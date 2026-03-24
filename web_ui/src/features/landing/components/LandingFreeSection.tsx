import type { FC } from 'react';
import { ArrowRight, Play, Shield, Sparkles } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface LandingFreeSectionProps {
  onScrollToVideo: () => void;
}

export const LandingFreeSection: FC<LandingFreeSectionProps> = ({ onScrollToVideo }) => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none"></div>

    <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6 sm:space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] animate-pulse">
        <Sparkles size={14} /> Limited Time Offer
      </div>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Everything is Free</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto">
        We&apos;re giving <span className="font-bold text-primary">10GB of free storage</span> to every user who signs up during our launch period. All features are included - no hidden fees, no premium tiers.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
        <Link to="/signup" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm shadow-xl shadow-primary/30">
          Get Started Free
          <ArrowRight size={18} />
        </Link>
        <button
          onClick={onScrollToVideo}
          className="px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm border border-slate-200 dark:border-slate-700"
        >
          <Play size={18} />
          Watch Demo
        </button>
      </div>

      <div className="pt-8 flex items-center justify-center gap-2 text-slate-400">
        <Shield size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Your data is secure and protected</span>
      </div>
    </div>
  </section>
);

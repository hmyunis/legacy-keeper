import type { FC } from 'react';
import { ArrowRight, GitBranch, Play, Shield, Sparkles } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface LandingHeroSectionProps {
  isAuthenticated: boolean;
  onScrollToVideo: () => void;
}

export const LandingHeroSection: FC<LandingHeroSectionProps> = ({
  isAuthenticated,
  onScrollToVideo,
}) => (
  <section className="pt-32 pb-20 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-left duration-700">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em]">
          <Sparkles size={14} /> The Future of Heritage
        </div>
        <h1 className="text-3xl sm:text-4xl xs:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
          Preserving <span className="text-primary">Memories</span> for Tomorrow.
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          An intelligent family memory vault that uses AI to organize your photos, videos, and documents. Build your interactive family tree and preserve your legacy for generations to come.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 hover:opacity-90 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group text-center text-xs sm:text-sm">
              Go to Dashboard
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link to="/signup" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 hover:opacity-90 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group text-center text-xs sm:text-sm">
                Begin Your Legacy
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={onScrollToVideo}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 sm:gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-xs sm:text-sm"
              >
                <Play size={18} />
                Explore Demo
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative animate-in slide-in-from-right duration-1000">
        <div className="absolute -top-10 -left-10 w-32 h-32 sm:w-40 sm:h-40 bg-primary/20 rounded-full blur-[60px] sm:blur-[80px]"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-indigo-400/20 rounded-full blur-[60px] sm:blur-[80px]"></div>
        <div className="relative bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-4xl sm:rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 rotate-2 group hover:rotate-0 transition-transform duration-700">
          <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1000" className="rounded-3xl sm:rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-700" alt="Legacy" />
          <div className="absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce duration-3000">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-tighter">Security</p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Your memories are protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

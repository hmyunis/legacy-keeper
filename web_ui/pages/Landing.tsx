
import React from 'react';
import { Shield, GitBranch, Sparkles, Users, ArrowRight, Check, Zap, Crown, Database } from 'lucide-react';
import { Link } from '@tanstack/react-router';

const PLANS = [
  {
    name: 'Basic',
    storage: '10GB',
    price: '$0',
    oldPrice: null,
    desc: 'Perfect for starting your journey.',
    icon: <Shield className="text-slate-400" />,
    features: ['10GB Secure Storage', 'Standard Face Detection', '200 Archival Records', 'Single Family Circle'],
    color: 'bg-slate-50 dark:bg-slate-900',
    button: 'Start Free'
  },
  {
    name: 'Heritage',
    storage: '50GB',
    price: '$0',
    oldPrice: '$9.99',
    desc: 'Comprehensive archive for the whole family.',
    icon: <Zap className="text-primary" />,
    features: ['50GB Secure Storage', 'High-Res Preservation', 'Unlimited Records', 'Advanced Lineage Maps', 'Audit Log Export'],
    color: 'bg-primary/5 dark:bg-primary/10 border-primary/20',
    button: 'Get Heritage Access',
    popular: true
  },
  {
    name: 'Dynasty',
    storage: '500GB',
    price: '$0',
    oldPrice: '$24.99',
    desc: 'For serious generational historians.',
    icon: <Crown className="text-amber-500" />,
    features: ['500GB Secure Storage', 'Lossless Archival Engine', 'Bulk Metadata Export', 'Priority Support', 'Generational Handover Tools'],
    color: 'bg-slate-900 text-white',
    button: 'Claim Dynasty Plan'
  }
];

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-3 shrink-0 group/logo transition-opacity hover:opacity-80"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 text-sm sm:text-base">L</div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-xl tracking-tight xs:block">LegacyKeeper</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/login" className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors uppercase tracking-widest px-2 sm:px-3 py-2">Sign In</Link>
            <Link to="/signup" className="bg-primary text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs hover:opacity-90 transition-all shadow-lg shadow-primary/20 glow-primary uppercase tracking-widest whitespace-nowrap">Open Vault</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
              <Sparkles size={14} /> The Future of Heritage
            </div>
            <h1 className="text-4xl xs:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Preserving <span className="text-primary">History</span> for the Next Generation.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              An intelligent family memory vault for securely storing, organizing, and interacting with your digital heritage through AI-driven categorization and interactive family trees.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group text-center">
                Begin Your Legacy
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-2xl font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-center">
                Explore Demo
              </Link>
            </div>
          </div>
          <div className="relative animate-in slide-in-from-right duration-1000">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-[80px]"></div>
            <div className="relative bg-white dark:bg-slate-900 p-4 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 rotate-2 group hover:rotate-0 transition-transform duration-700">
              <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1000" className="rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-700" alt="Legacy" />
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Shield size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-tighter">Security Protocol</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Bank-Grade Encryption</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 bg-white dark:bg-slate-900/40 relative">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Archival Superpowers</h2>
            <p className="text-slate-500 dark:text-slate-400">Everything you need to secure and visualize your family's journey through time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Database />, title: 'Secure Vault', desc: 'Encrypted storage for photos, videos, and legal documents.', color: 'bg-primary/10 text-primary' },
              { icon: <GitBranch />, title: 'Interactive Tree', desc: 'Visualize generations and complex family links with ease.', color: 'bg-purple-50 text-purple-600' },
              { icon: <Sparkles />, title: 'Deep Indexing', desc: 'Categorize artifacts by date, place, and people automatically.', color: 'bg-emerald-50 text-emerald-600' },
              { icon: <Users />, title: 'Shared Circle', desc: 'Collaborate with relatives in a private, secure environment.', color: 'bg-rose-50 text-rose-600' },
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                <div className={`w-14 h-14 ${feature.color} dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                  {React.cloneElement(feature.icon as any, { size: 28 })}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
              Launch Celebration: Limited Time Free Access
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Investment in your Heritage</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Secure your generational legacy with flexible archival storage plans.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {PLANS.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-8 sm:p-10 rounded-[3rem] border transition-all duration-500 flex flex-col hover:shadow-2xl hover:-translate-y-1 group ${plan.color} ${plan.popular ? 'ring-4 ring-primary/10 shadow-xl border-primary scale-[1.02]' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Most Popular Choice
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-8">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                    {React.cloneElement(plan.icon as any, { size: 32 })}
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${plan.name === 'Dynasty' ? 'text-primary' : 'text-slate-400'}`}>Capacity</p>
                    <p className="text-2xl font-black">{plan.storage}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <h3 className="text-2xl font-bold">{plan.name} Plan</h3>
                  <p className={`text-xs opacity-70 ${plan.name === 'Dynasty' ? 'text-white/70' : 'text-slate-500'}`}>{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-2 mb-10">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="text-sm font-bold opacity-50 uppercase tracking-widest">/ month</span>
                  {plan.oldPrice && ( plan.price === '$0' && (
                    <span className="text-lg font-bold text-rose-500 line-through ml-auto opacity-80">
                      {plan.oldPrice}
                    </span>
                  ))}
                </div>

                <div className="space-y-5 mb-12 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Included Features</p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <Check size={14} className={plan.name === 'Dynasty' ? 'text-primary' : 'text-emerald-500'} strokeWidth={4} />
                      </div>
                      <span className="text-[11px] font-bold leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>

                <Link 
                  to="/signup" 
                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all text-center shadow-lg active:scale-95 ${
                    plan.name === 'Dynasty' 
                      ? 'bg-primary text-white hover:opacity-90' 
                      : plan.popular 
                        ? 'bg-primary text-white hover:opacity-90' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {plan.button}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
              <Shield size={16} /> Data is fully encrypted and private to your family circle.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg">L</div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">LegacyKeeper</span>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} LegacyKeeper Archival Systems. All rights reserved.</p>
          <div className="flex gap-6">
            <button className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Privacy</button>
            <button className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Security</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

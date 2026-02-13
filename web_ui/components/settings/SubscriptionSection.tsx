
import React, { useState } from 'react';
import { Check, Shield, Zap, Crown, HardDrive, Loader2, CreditCard } from 'lucide-react';
import { SubscriptionTier } from '../../types';
import { useAuthStore, STORAGE_LIMITS } from '../../stores/authStore';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'BASIC' as SubscriptionTier,
    name: 'Basic',
    desc: 'Personal legacy foundation',
    price: '$0',
    oldPrice: null,
    icon: <Shield />,
    features: ['10GB Secure Storage', 'Standard Face Detection', '200 Archival Records', 'Single Family Circle']
  },
  {
    id: 'HERITAGE' as SubscriptionTier,
    name: 'Heritage',
    desc: 'The comprehensive archive',
    price: '$0',
    oldPrice: '$9.99',
    icon: <Zap />,
    features: ['50GB Secure Storage', 'High-Res Preservation', 'Unlimited Records', 'Multiple Lineage Maps', 'Audit Log Export']
  },
  {
    id: 'DYNASTY' as SubscriptionTier,
    name: 'Dynasty',
    desc: 'For generational historians',
    price: '$0',
    oldPrice: '$24.99',
    icon: <Crown />,
    features: ['500GB Secure Storage', 'Lossless Archival Engine', 'Bulk Metadata Export', 'Priority Preservation Support', 'Dedicated Heritage Manager']
  }
];

const SubscriptionSection: React.FC = () => {
  const { currentUser, upgradePlan } = useAuthStore();
  const [upgradingTo, setUpgradingTo] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier === currentUser?.subscriptionTier) return;
    
    setUpgradingTo(tier);
    // Mock payment flow
    setTimeout(() => {
      upgradePlan(tier);
      setUpgradingTo(null);
      toast.success(`Subscription Optimized`, {
        description: `Your vault has been upgraded to the ${tier} plan.`,
        icon: <Zap size={16} className="text-primary" />
      });
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-8 md:p-12 shadow-sm space-y-8 glow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Subscription & Storage</h3>
            <p className="text-sm text-slate-500">Scale your family's archival capacity as your legacy grows.</p>
          </div>
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">Special Launch Offer Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentUser?.subscriptionTier === plan.id;
            const isUpgrading = upgradingTo === plan.id;
            
            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500 ${
                  isCurrent 
                    ? 'border-primary bg-primary/[0.02] shadow-xl dark:bg-primary/[0.03]' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-primary/30 bg-slate-50/50 dark:bg-slate-950/20'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Active Plan
                  </div>
                )}
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                  {React.cloneElement(plan.icon as any, { size: 24 })}
                </div>

                <div className="space-y-1 mb-6">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                  <p className="text-xs text-slate-500 leading-tight">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ Month</span>
                  {plan.oldPrice && (
                    <span className="text-sm font-bold text-slate-300 dark:text-slate-600 line-through ml-auto">
                      {plan.oldPrice}
                    </span>
                  )}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-full p-0.5">
                        <Check size={10} strokeWidth={4} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || !!upgradingTo}
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${
                    isCurrent 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary hover:bg-primary hover:text-white hover:border-primary shadow-sm active:scale-95'
                  }`}
                >
                  {isUpgrading ? <Loader2 size={14} className="animate-spin" /> : isCurrent ? 'Active' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-8 bg-slate-900 dark:bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md">
            <CreditCard size={32} className="text-primary" />
          </div>
          <div className="space-y-1 text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Secure Billing</p>
            <h4 className="text-xl font-bold">Mock Archival Transaction</h4>
            <p className="text-xs text-white/50">LegacyKeeper will never ask for your real credit card during this beta phase.</p>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2 relative z-10">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Next Billing Date</p>
          <p className="text-lg font-black text-white">N/A — Perpetual Beta Access</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSection;

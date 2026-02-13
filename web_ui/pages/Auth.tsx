
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Mail, Lock, User, ShieldCheck, ArrowRight, Eye, EyeOff, Loader2, Shield, UserPen, Ghost } from 'lucide-react';
import { UserRole } from '../types';
import { toast } from 'sonner';
import { useNavigate, useLocation, Link } from '@tanstack/react-router';

const Auth: React.FC = () => {
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>(location.pathname === '/signup' ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: 'abebe.t@legacy.et',
    password: 'password123'
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const performLogin = (userData: any) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(userData, `mock_jwt_${Date.now()}`);
      toast.success(`Access Granted: ${userData.role} Session Initialized`);
      navigate({ to: '/' });
    }, 800);
  };

  const handleQuickLogin = (role: UserRole) => {
    const rolesConfig = {
      [UserRole.ADMIN]: { name: 'Abebe Tadesse', email: 'abebe.t@legacy.et' },
      [UserRole.CONTRIBUTOR]: { name: 'Leyla Ahmed', email: 'leyla.a@legacy.et' },
      [UserRole.VIEWER]: { name: 'Mohammed Tadesse', email: 'mohammed.t@legacy.et' },
    };

    const config = rolesConfig[role];
    const mockUser = {
      id: 'user-' + role.toLowerCase(),
      fullName: config.name,
      email: config.email,
      role: role,
      profilePhoto: `https://picsum.photos/seed/${config.name}/100/100`,
      subscriptionTier: 'HERITAGE',
      storageUsed: 2.4
    };
    performLogin(mockUser);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser = {
      id: 'user-' + Date.now(),
      fullName: formData.fullName || (mode === 'login' ? 'Abebe Tadesse' : 'New User'),
      email: formData.email,
      role: UserRole.ADMIN, // Default for manual login
      profilePhoto: `https://picsum.photos/seed/${formData.email}/100/100`,
      subscriptionTier: 'BASIC',
      storageUsed: 0
    };
    performLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-500 overflow-x-hidden">
      {/* Branding Side (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 bg-primary text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16 group/logo transition-opacity hover:opacity-80 inline-flex">
            <div className="w-12 h-12 bg-white text-primary rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl">L</div>
            <span className="font-bold text-2xl tracking-tighter">LegacyKeeper</span>
          </Link>
          <div className="max-w-md space-y-6">
            <h1 className="text-6xl font-black leading-tight tracking-tighter">Safeguard your family's future today.</h1>
            <p className="text-white/90 text-lg leading-relaxed italic opacity-80 border-l-4 border-white/30 pl-6">
              "Archiving is not just about the past; it's about the connection we leave behind for those who follow."
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map(i => (
              <img key={i} src={`https://picsum.photos/seed/ethioface${i}/100/100`} className="w-10 h-10 rounded-full border-4 border-primary" />
            ))}
          </div>
          <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Join 1,200+ families archiving history.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-20 relative overflow-y-auto min-h-screen lg:min-h-0">
        <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 py-10 lg:py-0">
          
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-4 group/logo transition-opacity hover:opacity-80 inline-flex">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black shadow-lg">L</div>
            <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tighter">LegacyKeeper</span>
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              {mode === 'login' ? 'Welcome back' : 'Create an Account'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
              {mode === 'login' ? "Secure access to your family's digital heritage." : "Join our community and start your archival journey."}
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => { setMode('login'); navigate({ to: '/login' }); }}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setMode('signup'); navigate({ to: '/signup' }); }}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'signup' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Identity</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    required={mode === 'signup'}
                    placeholder="Abebe Tadesse"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Archival Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="abebe.t@legacy.et"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Password</label>
                {mode === 'login' && <button type="button" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Lost access?</button>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              disabled={isLoading}
              type="submit" 
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  {mode === 'login' ? 'Access Vault' : 'Initialize Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Section */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-800"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 tracking-widest">Quick Access (Demo)</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => handleQuickLogin(UserRole.ADMIN)}
                  className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary/50 transition-all group"
                >
                  <div className="p-2 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <Shield size={18} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter dark:text-slate-400">Admin</span>
                </button>
                <button 
                  onClick={() => handleQuickLogin(UserRole.CONTRIBUTOR)}
                  className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary/50 transition-all group"
                >
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <UserPen size={18} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter dark:text-slate-400">Contributor</span>
                </button>
                <button 
                  onClick={() => handleQuickLogin(UserRole.VIEWER)}
                  className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary/50 transition-all group"
                >
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-slate-600 group-hover:text-white transition-colors">
                    <Ghost size={18} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter dark:text-slate-400">Viewer</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} /> End-to-End Encryption
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

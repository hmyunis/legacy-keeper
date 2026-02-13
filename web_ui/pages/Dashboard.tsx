
import React from 'react';
import { 
  Database, 
  Users, 
  Calendar, 
  Plus, 
  ChevronRight, 
  GitBranch, 
  CheckCircle2,
  HardDrive,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services/mockApi';
import { hasPermission } from '../constants';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from '../i18n/LanguageContext';
import { CardSkeleton, MediaCardSkeleton, Skeleton } from '../components/Skeleton';
import { useAuthStore, STORAGE_LIMITS } from '../stores/authStore';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { data: media, isLoading } = useQuery({ queryKey: ['media'], queryFn: mockApi.getMedia });
  const navigate = useNavigate();
  
  const handleAddMemory = () => {
    navigate({ to: '/vault', search: { action: 'upload' } } as any);
  };

  const stats = [
    { label: t.dashboard.stats.totalMemories, value: '1,240', icon: <Database className="text-primary" />, bgColor: 'bg-primary/10', to: '/vault' },
    { label: t.dashboard.stats.familyMembers, value: '18', icon: <Users className="text-primary" />, bgColor: 'bg-primary/10', to: '/members' },
    { label: t.dashboard.stats.timelineEvents, value: '45', icon: <Calendar className="text-primary" />, bgColor: 'bg-primary/10', to: '/timeline' },
  ];

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isViewer = currentUser?.role === UserRole.VIEWER;
  const showVaultHealth = !isViewer;
  const showQuickAccess = isAdmin;

  const storageLimit = currentUser ? STORAGE_LIMITS[currentUser.subscriptionTier] : 10;
  const storageUsed = currentUser?.storageUsed || 2.4;
  const storagePercent = Math.min((storageUsed / storageLimit) * 100, 100);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.dashboard.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t.dashboard.subtitle}</p>
        </div>
        {currentUser && hasPermission(currentUser.role, 'UPLOAD_MEDIA') && (
          <button 
            onClick={handleAddMemory}
            className="w-full sm:w-auto bg-primary text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg glow-primary active:scale-95"
          >
            <Plus size={18} />
            {t.dashboard.addMemory}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {isLoading 
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : stats.map((stat) => (
            <button 
              key={stat.label} 
              onClick={() => navigate({ to: stat.to as any })}
              className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 transition-all text-left group glow-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform shadow-sm`}>
                  {stat.icon}
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-primary transition-all" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
            </button>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t.dashboard.recentUploads}</h2>
            <button 
              onClick={() => navigate({ to: '/vault' })}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
            >
              {t.dashboard.viewAll}
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {isLoading 
              ? Array.from({ length: 4 }).map((_, i) => <MediaCardSkeleton key={i} />)
              : media?.slice(0, 4).map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => navigate({ to: '/vault' })}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
                    <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 sm:p-4">
                      <p className="text-white text-[10px] sm:text-xs font-bold truncate">{item.title}</p>
                      <p className="text-white/60 text-[8px] sm:text-[10px]">{new Date(item.dateTaken).getFullYear()}</p>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="bg-primary dark:bg-primary/90 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden group shadow-2xl">
            <div className="relative z-10 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-bold mb-3">{t.dashboard.lineageTitle}</h3>
              <p className="text-white/80 text-xs sm:text-sm mb-6 leading-relaxed opacity-90">{t.dashboard.lineageDesc}</p>
              <button 
                onClick={() => navigate({ to: '/tree' })}
                className="w-full sm:w-auto bg-white text-primary px-6 py-3 rounded-xl font-bold text-xs hover:bg-white/90 transition-all glow-primary"
              >
                {t.dashboard.exploreTree}
              </button>
            </div>
            <GitBranch size={200} className="hidden sm:block absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
          </div>
        </div>

        <div className="space-y-6">
          {showVaultHealth && (
            <>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-2">{t.dashboard.vaultHealth}</h2>
              <div className="p-5 sm:p-6 bg-white dark:bg-slate-900/60 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-6 shadow-sm">
                 {isLoading 
                   ? <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-3 w-full" /></div>
                   : <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-primary ${storagePercent > 90 ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10'}`}>
                            <HardDrive size={20} className="sm:size-6" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">{t.dashboard.archivalStorage}</p>
                            <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                              {storageUsed} GB / {storageLimit} GB Used
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate({ to: '/settings', search: { tab: 'subscription' } as any })}
                          className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-primary hover:bg-primary/10 transition-all"
                        >
                          <Zap size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${storagePercent > 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-primary shadow-[0_0_10px_var(--color-primary)]'}`}
                            style={{ width: `${storagePercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[8px] sm:text-[10px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                          <span>{storagePercent > 90 ? 'Near Capacity' : 'Optimal'}</span>
                          <span>{Math.round(storagePercent)}% Capacity</span>
                        </div>
                      </div>
                      
                      {currentUser?.subscriptionTier !== 'DYNASTY' && (
                        <button 
                          onClick={() => navigate({ to: '/settings', search: { tab: 'subscription' } as any })}
                          className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                        >
                          Unlock More Storage
                        </button>
                      )}
                    </>
                 }
              </div>
            </>
          )}

          {showQuickAccess && (
            <>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-2">{t.dashboard.quickAccess.title}</h2>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => navigate({ to: '/members' })}
                  className="w-full p-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-4 hover:border-primary transition-all glow-card"
                >
                  <div className="p-2 bg-primary/10 rounded-xl"><Users size={18} className="text-primary" /></div>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{t.dashboard.quickAccess.invite}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t.dashboard.quickAccess.inviteDesc}</p>
                  </div>
                </button>
                <button 
                  onClick={() => navigate({ to: '/logs' })}
                  className="w-full p-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-4 hover:border-emerald-400 transition-all glow-card"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"><CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{t.dashboard.quickAccess.logs}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t.dashboard.quickAccess.logsDesc}</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

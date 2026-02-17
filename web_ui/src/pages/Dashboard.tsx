import React from 'react';
import { 
  Database, 
  Users,
  Calendar, 
  Plus, 
  ChevronRight, 
  GitBranch,
  Image
} from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { hasPermission } from '@/config/permissions';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from '../i18n/LanguageContext';
import { CardSkeleton, MediaCardSkeleton } from '../components/Skeleton';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
import { useMemo } from 'react';
import { useVault } from '../hooks/useVaults';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, activeVaultId } = useAuthStore();
  const { data: mediaData, isLoading: isLoadingMedia } = useMedia();
  const { data: activeVault, isLoading: isLoadingVault } = useVault(activeVaultId || '');
  const navigate = useNavigate();
  
  const handleAddMemory = () => {
    navigate({ to: '/vault', search: { action: 'upload' } });
  };

  const allMedia = useMemo(() => {
    if (!mediaData) return [];
    return mediaData.pages.flatMap(page => page.items);
  }, [mediaData]);

  const memberCount = activeVault?.memberCount || 0;
  const totalMemories = allMedia.length;
  const timelineEvents = useMemo(() => {
    const withValidDate = allMedia.filter((item) => !Number.isNaN(new Date(item.dateTaken).getTime()));
    return withValidDate.length || allMedia.length;
  }, [allMedia]);

  const stats = [
    { 
      label: t.dashboard.stats.totalMemories, 
      value: totalMemories.toLocaleString(), 
      icon: <Database className="text-primary" />, 
      bgColor: 'bg-primary/10', 
      to: '/vault' 
    },
    { 
      label: t.dashboard.stats.familyMembers, 
      value: memberCount.toString(), 
      icon: <Users className="text-primary" />, 
      bgColor: 'bg-primary/10', 
      to: '/members' 
    },
    { 
      label: t.dashboard.stats.timelineEvents, 
      value: timelineEvents.toLocaleString(),
      icon: <Calendar className="text-primary" />, 
      bgColor: 'bg-primary/10', 
      to: '/timeline' 
    },
  ];

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const showQuickAccess = isAdmin;

  const isLoading = isLoadingMedia || isLoadingVault;

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
              onClick={() => navigate({ to: stat.to })}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="xl:col-span-2 space-y-6">
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
            {isLoadingMedia 
              ? Array.from({ length: 4 }).map((_, i) => <MediaCardSkeleton key={i} />)
              : allMedia.length === 0 ? (
                <div className="col-span-full">
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <Image size={32} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2">Your vault is empty</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">Start preserving your family's precious memories by uploading your first photo or video.</p>
                    {currentUser && hasPermission(currentUser.role, 'UPLOAD_MEDIA') && (
                      <button 
                        onClick={handleAddMemory}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
                      >
                        <Plus size={18} />
                        Upload First Memory
                      </button>
                    )}
                  </div>
                </div>
              ) : allMedia.slice(0, 4).map((item) => (
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
        </div>

        <div className="space-y-6">
          <div className="bg-primary dark:bg-primary/90 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden group shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold mb-3">{t.dashboard.lineageTitle}</h3>
              <p className="text-white/80 text-xs sm:text-sm mb-6 leading-relaxed opacity-90">{t.dashboard.lineageDesc}</p>
              <button 
                onClick={() => navigate({ to: '/tree' })}
                className="w-full sm:w-auto bg-white text-primary px-6 py-3 rounded-xl font-bold text-xs hover:bg-white/90 transition-all glow-primary"
              >
                {t.dashboard.exploreTree}
              </button>
            </div>
            <GitBranch size={160} className="hidden sm:block absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
          </div>

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
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"><GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
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

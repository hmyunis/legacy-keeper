import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { hasPermission } from '@/config/permissions';
import { DashboardAside } from '@/features/dashboard/components/DashboardAside';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import { RecentUploadsSection } from '@/features/dashboard/components/RecentUploadsSection';
import {
  countTimelineEvents,
  flattenDashboardMedia,
  getRecentUploads,
} from '@/features/dashboard/selectors';
import type { DashboardRoute, DashboardStat } from '@/features/dashboard/types';
import { useMedia } from '../hooks/useMedia';
import { useSignedUrlRecovery } from '../hooks/useSignedUrlRecovery';
import { useVault } from '../hooks/useVaults';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const Dashboard = () => {
  const { t } = useTranslation();
  const { currentUser, activeVaultId } = useAuthStore();
  const { data: mediaData, isLoading: isLoadingMedia } = useMedia();
  const { data: activeVault, isLoading: isLoadingVault } = useVault(activeVaultId || '');
  const recoverSignedUrls = useSignedUrlRecovery();
  const navigate = useNavigate();

  const allMedia = useMemo(() => flattenDashboardMedia(mediaData), [mediaData]);
  const recentUploads = useMemo(() => getRecentUploads(allMedia), [allMedia]);
  const timelineEvents = useMemo(() => countTimelineEvents(allMedia), [allMedia]);

  const memberCount = activeVault?.memberCount || 0;
  const totalMemories = allMedia.length;
  const canUploadMedia = Boolean(currentUser && hasPermission(currentUser.role, 'UPLOAD_MEDIA'));

  const stats: DashboardStat[] = useMemo(
    () => [
      {
        label: t.dashboard.stats.totalMemories,
        value: totalMemories.toLocaleString(),
        to: '/vault',
        icon: 'memories',
      },
      {
        label: t.dashboard.stats.familyMembers,
        value: memberCount.toString(),
        to: '/members',
        icon: 'members',
      },
      {
        label: t.dashboard.stats.timelineEvents,
        value: timelineEvents.toLocaleString(),
        to: '/timeline',
        icon: 'timeline',
      },
    ],
    [memberCount, t.dashboard.stats.familyMembers, t.dashboard.stats.timelineEvents, t.dashboard.stats.totalMemories, timelineEvents, totalMemories],
  );

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const showQuickAccess = isAdmin;
  const isLoading = isLoadingMedia || isLoadingVault;

  const navigateTo = (to: DashboardRoute) => {
    navigate({ to });
  };

  const handleAddMemory = () => {
    navigate({
      to: '/vault',
      search: (prev: Record<string, unknown>) => ({ ...prev, action: 'upload' }),
    } as any);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <DashboardHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        canUpload={canUploadMedia}
        addMemoryLabel={t.dashboard.addMemory}
        onAddMemory={handleAddMemory}
      />

      <DashboardStatsGrid stats={stats} isLoading={isLoading} onNavigate={navigateTo} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="xl:col-span-2 space-y-6">
          <RecentUploadsSection
            title={t.dashboard.recentUploads}
            viewAllLabel={t.dashboard.viewAll}
            isLoading={isLoadingMedia}
            items={recentUploads}
            canUpload={canUploadMedia}
            onViewAll={() => navigateTo('/vault')}
            onAddMemory={handleAddMemory}
            onOpenItem={() => navigateTo('/vault')}
            onRecoverSignedUrl={(mediaId) => {
              void recoverSignedUrls(mediaId);
            }}
          />
        </div>

        <DashboardAside
          lineageTitle={t.dashboard.lineageTitle}
          lineageDescription={t.dashboard.lineageDesc}
          exploreTreeLabel={t.dashboard.exploreTree}
          showQuickAccess={showQuickAccess}
          quickAccessTitle={t.dashboard.quickAccess.title}
          inviteTitle={t.dashboard.quickAccess.invite}
          inviteDescription={t.dashboard.quickAccess.inviteDesc}
          logsTitle={t.dashboard.quickAccess.logs}
          logsDescription={t.dashboard.quickAccess.logsDesc}
          onExploreTree={() => navigateTo('/tree')}
          onOpenMembers={() => navigateTo('/members')}
          onOpenLogs={() => navigateTo('/logs')}
        />
      </div>
    </div>
  );
};

export default Dashboard;

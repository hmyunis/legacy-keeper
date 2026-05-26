import { useEffect, useMemo, useState } from 'react';
import { UserFocus, Palette, Database, MagicWand, Sparkle, BellRinging, Spinner } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useMutation } from '@tanstack/react-query';
import axiosClient from '../services/axiosClient';
import { getPushState, subscribeToPush, unsubscribeFromPush } from '../lib/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard';
import { useNavigate, useRouterState } from '@tanstack/react-router';

type SettingsTab = 'ACCOUNT' | 'THEME' | 'HEALTH';

const TAB_TO_SLUG: Record<SettingsTab, string> = {
  ACCOUNT: 'identity',
  THEME: 'appearance',
  HEALTH: 'health',
};

const SLUG_TO_TAB: Record<string, SettingsTab> = {
  identity: 'ACCOUNT',
  appearance: 'THEME',
  health: 'HEALTH',
};

export default function Settings() {
  const [selectedColor, setSelectedColor] = useState('#B88F5B');
  const [grainEnabled, setGrainEnabled] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [isLoadingPurgePreview, setIsLoadingPurgePreview] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [purgeGroups, setPurgeGroups] = useState<any[]>([]);
  const [selectedPurgeIds, setSelectedPurgeIds] = useState<Record<string, boolean>>({});
  const { currentUser, activeVaultId, login } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: summary } = useDashboardSummary();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchString = useRouterState({ select: (s) => s.location.search });
  const tabSlug = new URLSearchParams(searchString).get('tab') || undefined;
  const activeTab: SettingsTab = SLUG_TO_TAB[tabSlug || ''] || 'ACCOUNT';

  const smartPurgeMutation = useMutation({
    mutationFn: (memoryIds?: string[]) => axiosClient.post(`/vaults/${activeVaultId}/memories/purge/`, { memory_ids: memoryIds || [] })
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => axiosClient.put(`/vaults/${activeVaultId}/settings/`, data)
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => axiosClient.put(`/auth/profile/`, data)
  });

  const pushTestMutation = useMutation({
    mutationFn: () => axiosClient.post('/auth/push-test/'),
  });

  useEffect(() => {
    if (!summary?.theme) return;
    if (summary.theme.primaryHue) setSelectedColor(summary.theme.primaryHue);
    if (typeof summary.theme.grainEnabled === 'boolean') setGrainEnabled(summary.theme.grainEnabled);
  }, [summary?.theme?.primaryHue, summary?.theme?.grainEnabled]);

  useEffect(() => {
    if (pathname !== '/settings') return;
    if (!tabSlug || !SLUG_TO_TAB[tabSlug]) {
      navigate({
        to: '/settings',
        search: (prev: Record<string, unknown>) => ({ ...prev, tab: 'identity' }),
        replace: true,
      });
    }
  }, [navigate, pathname, tabSlug]);

  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'ACCOUNT') return;
    setIsPushLoading(true);
    getPushState()
      .then((state) => {
        if (!mounted) return;
        setIsPushEnabled(state.enabled);
      })
      .catch(() => {
        if (!mounted) return;
        setIsPushEnabled(false);
      })
      .finally(() => {
        if (mounted) setIsPushLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const applyThemePreview = (next: { primaryHue?: string; grainEnabled?: boolean }) => {
    queryClient.setQueryData(['dashboardSummary', activeVaultId], (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        theme: {
          ...prev.theme,
          ...(next.primaryHue !== undefined ? { primaryHue: next.primaryHue } : {}),
          ...(next.grainEnabled !== undefined ? { grainEnabled: next.grainEnabled } : {}),
        },
      };
    });
  };

  const handleOpenPurgeDialog = async () => {
    setIsLoadingPurgePreview(true);
    try {
      const res = await axiosClient.get(`/vaults/${activeVaultId}/memories/purge/`);
      const groups = res.data?.groups || [];
      const defaults = res.data?.default_delete_ids || [];
      const selectedMap: Record<string, boolean> = {};
      defaults.forEach((id: string) => {
        selectedMap[id] = true;
      });
      setPurgeGroups(groups);
      setSelectedPurgeIds(selectedMap);
      setIsPurgeDialogOpen(true);
    } catch {
      sileo.error({ title: "Purge Preview Failed", description: "Could not load duplicates for review." });
    } finally {
      setIsLoadingPurgePreview(false);
    }
  };

  const selectedIdsList = useMemo(
    () => Object.entries(selectedPurgeIds).filter(([, checked]) => checked).map(([id]) => id),
    [selectedPurgeIds]
  );
  const purgeReviewSummary = useMemo(() => {
    const totalCandidates = purgeGroups.reduce((count, group) => count + (group.items?.length || 0), 0);
    const keptCount = Math.max(totalCandidates - selectedIdsList.length, 0);
    const selectedBytes = purgeGroups.reduce((total, group) => {
      return total + (group.items || []).reduce((groupTotal: number, item: any) => {
        return groupTotal + (selectedPurgeIds[item.id] ? Number(item.filesize || 0) : 0);
      }, 0);
    }, 0);
    return {
      totalCandidates,
      keptCount,
      estimatedMb: (selectedBytes / (1024 * 1024)).toFixed(2),
    };
  }, [purgeGroups, selectedIdsList.length, selectedPurgeIds]);

  const handleSelectKeepArtifact = (group: any, keepId: string) => {
    setSelectedPurgeIds((prev) => {
      const next = { ...prev };
      (group.items || []).forEach((item: any) => {
        next[item.id] = item.id !== keepId;
      });
      return next;
    });
  };

  const handleTogglePurgeArtifact = (itemId: string, checked: boolean) => {
    setSelectedPurgeIds((prev) => ({ ...prev, [itemId]: checked }));
  };

  const handleConfirmSmartPurge = async () => {
    sileo.promise(smartPurgeMutation.mutateAsync(selectedIdsList), {
      loading: { title: "Deduplicating...", description: "Selecting highest-quality artifacts..." },
      success: (res) => {
        queryClient.invalidateQueries();
        const { purged, mb_saved } = res.data;
        setIsPurgeDialogOpen(false);
        return {
          title: "Vault Optimized",
          description: purged > 0
            ? `Successfully expunged ${purged} duplicates, reclaiming ${mb_saved} MB.`
            : "No visual redundancy detected. Your archive is pristine."
        };
      },
      error: { title: "Purge Failed" }
    });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    applyThemePreview({ primaryHue: color });
    updateSettingsMutation.mutate({ primary_hue: color }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', activeVaultId] });
        sileo.success({ title: "Palette Updated", description: `Museum hue changed.` });
      }
    });
  };

  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    sileo.promise(updateProfileMutation.mutateAsync({ fullName, email }), {
      loading: { title: "Saving..." },
      success: (res) => {
        login({ user: { ...currentUser, ...res.data }, accessToken: useAuthStore.getState().accessToken!, refreshToken: useAuthStore.getState().refreshToken!, activeVaultId });
        return { title: "Identity Updated", description: "Your profile has been saved." };
      },
      error: { title: "Failed to update profile" }
    });
  };

  const handlePushToggle = async () => {
    setIsPushLoading(true);
    try {
      if (isPushEnabled) {
        await unsubscribeFromPush();
        setIsPushEnabled(false);
        sileo.success({ title: "Alerts Disabled", description: "Push notifications were turned off for this browser." });
      } else {
        await subscribeToPush();
        setIsPushEnabled(true);
        sileo.success({ title: "Alerts Enabled", description: "You will now receive museum notifications." });
      }
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      if (message.includes('denied')) {
        sileo.error({ title: "Notifications Blocked", description: "Browser permission is denied. Enable notifications in site settings." });
      } else {
        sileo.error({ title: "Push Setup Failed", description: "Could not update notification settings on this device." });
      }
    } finally {
      setIsPushLoading(false);
    }
  };

  const handlePushTest = async () => {
    const toastId = sileo.show({
      type: 'loading',
      title: 'Sending test notification...',
      description: 'A sample push is being delivered to this browser.',
      duration: null,
    });

    try {
      const result = await pushTestMutation.mutateAsync();
      sileo.dismiss(toastId);

      const { sent = 0, failed = 0, deleted = 0 } = result?.data || {};
      if (sent > 0) {
        const deliverySummary = `Delivered to ${sent} active device${sent === 1 ? '' : 's'}.`;
        const cleanupSummary = deleted > 0
          ? `Cleaned up ${deleted} stale subscription${deleted === 1 ? '' : 's'} in the background.`
          : '';
        const retrySummary = failed > 0
          ? 'Some older devices could not be reached, but the notification was delivered successfully.'
          : 'Check your notifications for the preview message.';

        sileo.success({
          title: 'Test Delivered',
          description: `${deliverySummary} ${cleanupSummary} ${retrySummary}`.trim(),
          duration: 8000,
        });
      }
    } catch (err: any) {
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Test Failed',
        description: err?.response?.data?.error || 'Enable push notifications first or check the VAPID configuration.',
        duration: 10000,
      });
    }
  };

  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[var(--max-width)] mx-auto flex flex-col lg:flex-row gap-12">

        <aside className="w-full lg:w-[240px] space-y-2">
          <h2 className="font-display text-xl uppercase tracking-widest mb-8 text-[var(--clr-ink)]">Curator Settings</h2>
          {[
            { id: 'ACCOUNT', label: 'Identity', icon: <UserFocus /> },
            { id: 'THEME', label: 'Appearance', icon: <Palette /> },
            { id: 'HEALTH', label: 'Vault Health', icon: <Database /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() =>
                navigate({
                  to: '/settings',
                  search: (prev: Record<string, unknown>) => ({
                    ...prev,
                    tab: TAB_TO_SLUG[item.id as SettingsTab],
                  }),
                })
              }
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-ui font-bold text-[11px] uppercase tracking-[0.1em] transition-all ${
                activeTab === item.id ? 'bg-[var(--clr-gold)] text-white shadow-lg' : 'text-[var(--clr-dust)] hover:bg-[var(--clr-gold-muted)] hover:text-[var(--clr-gold-dark)]'
              }`}
            >
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1">
          <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">

            {activeTab === 'HEALTH' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <div className="flex items-center gap-2 text-[var(--clr-gold-dark)] font-bold text-[10px] uppercase tracking-widest mb-2">
                    <MagicWand size={16} weight="fill" /> AI-Driven Optimization
                  </div>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)]">Vault Storage Health</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">The AI curator continually analyzes your archive for visual redundancy and perceptual duplicates.</p>
                </header>

                <div className="p-6 bg-[var(--clr-paper)] rounded-3xl border-l-4 border-[var(--clr-info)] flex items-start gap-5">
                  <Database size={32} className="text-[var(--clr-info)] shrink-0" />
                  <div>
                    <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Smart Purge Ready</p>
                    <p className="font-ui text-[12px] text-[var(--clr-dust)] mt-1 leading-relaxed">
                      Executing a Smart Purge will command the AI to group identical burst-photos based on their perceptual hashes (pHash). You will review and confirm exactly which duplicates get deleted.
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-[var(--clr-aged)] flex justify-between items-center">
                   <div className="flex items-center gap-2 text-[var(--clr-gold)] font-bold text-[11px] uppercase tracking-widest">
                     <Sparkle size={14} weight="fill" /> Deduplication Engine
                   </div>
                   <Button variant="primary" onClick={handleOpenPurgeDialog} disabled={isLoadingPurgePreview || smartPurgeMutation.isPending}>
                     {isLoadingPurgePreview ? 'ANALYZING...' : smartPurgeMutation.isPending ? 'PURGING...' : 'START SMART PURGE'}
                   </Button>
                </div>
              </div>
            )}

            {activeTab === 'THEME' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Gallery Aesthetics</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">Customize the visual tone of your private museum.</p>
                </header>

                <div className="space-y-6">
                  <p className="font-ui text-[11px] font-black uppercase tracking-widest text-[var(--clr-fog)]">Primary Hue</p>
                  <div className="flex gap-4">
                    {['#B88F5B', '#7FAF8C', '#7C9FC1', '#C88383', '#5A524C'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        style={{ backgroundColor: color }}
                        className={`w-10 h-10 rounded-full border-4 shadow-lg transform transition-all active:scale-95 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-[var(--clr-aged)]">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Dynamic Museum Grain</p>
                       <p className="font-ui text-[12px] text-[var(--clr-dust)]">Adds subtle archival paper/noise texture across light surfaces for a vintage museum feel.</p>
                     </div>
                     <div
                       onClick={() => {
                         const next = !grainEnabled;
                         setGrainEnabled(next);
                         applyThemePreview({ grainEnabled: next });
                         updateSettingsMutation.mutate({ grain_enabled: next }, {
                           onSuccess: () => {
                             queryClient.invalidateQueries({ queryKey: ['dashboardSummary', activeVaultId] });
                             sileo.success({ title: "Grain Toggled", description: `Dynamic museum grain ${next ? 'enabled' : 'disabled'}.` });
                           }
                         });
                       }}
                       className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${grainEnabled ? 'bg-[var(--clr-gold)]' : 'bg-[var(--clr-aged)]'}`}
                     >
                         <motion.div animate={{ x: grainEnabled ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'ACCOUNT' && (
              <form onSubmit={handleSaveAccount} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Curator Identity</h3>
                </header>
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative group cursor-pointer" onClick={() => !isUploadingAvatar && document.getElementById('avatar-upload')?.click()}>
                    <img
                      src={(currentUser as any)?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.fullName?.replace(' ', '+')}&background=B88F5B&color=fff`}
                      alt="Profile"
                      className={`w-24 h-24 rounded-full border-4 border-[var(--clr-gold)] shadow-lg object-cover transition-opacity ${isUploadingAvatar ? 'opacity-50' : ''}`}
                    />
                    <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isUploadingAvatar ? <Spinner className="animate-spin text-white" size={24} /> : <span className="text-white text-xs font-ui font-bold uppercase">Change</span>}
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingAvatar}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingAvatar(true);
                        const formData = new FormData();
                        formData.append('avatar', file);

                        await sileo.promise(
                          axiosClient.patch('/auth/profile/', formData),
                          {
                            loading: { title: "Uploading Identity..." },
                            success: (res) => {
                              login({ user: { ...currentUser, ...res.data }, accessToken: useAuthStore.getState().accessToken!, refreshToken: useAuthStore.getState().refreshToken!, activeVaultId });
                              return { title: "Avatar Updated" };
                            },
                            error: { title: "Upload Failed" }
                          }
                        ).finally(() => setIsUploadingAvatar(false));
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl text-[var(--clr-ink)]">{currentUser?.fullName}</p>
                    <p className="font-ui text-sm text-[var(--clr-dust)]">{currentUser?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Legal Name</label>
                    <input name="fullName" defaultValue={currentUser?.fullName} className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Email Address</label>
                    <input name="email" type="email" defaultValue={currentUser?.email} className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                </div>

                <div className="pt-8 mt-4 border-t border-[var(--clr-aged)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[rgba(184,143,91,0.15)] flex items-center justify-center text-[var(--clr-gold)] shrink-0">
                      <BellRinging size={20} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Push Notifications</p>
                      <p className="font-ui text-[12px] text-[var(--clr-dust)]">Get pinged when AI curation or capsules finish processing.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={handlePushTest}
                      disabled={pushTestMutation.isPending || isPushLoading}
                      className="!h-8 !px-3 !py-1.5 !text-[9px] !tracking-[0.16em] !rounded-full whitespace-nowrap"
                    >
                      {pushTestMutation.isPending ? 'TESTING...' : 'TEST ALERT'}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={handlePushToggle}
                      disabled={isPushLoading || pushTestMutation.isPending}
                      className="!h-8 !px-3 !py-1.5 !text-[9px] !tracking-[0.16em] !rounded-full whitespace-nowrap"
                    >
                      {isPushLoading ? 'UPDATING...' : isPushEnabled ? 'DISABLE ALERTS' : 'ENABLE ALERTS'}
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--clr-aged)]">
                  <Button variant="primary" type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? 'SAVING...' : 'SAVE IDENTITY'}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </main>
      </div>

      <AnimatePresence>
        {isPurgeDialogOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPurgeDialogOpen(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--clr-aged)] bg-[var(--clr-linen)] shadow-2xl flex flex-col">
              <div className="p-5 sm:p-6 border-b border-[var(--clr-aged)]">
                <h3 className="font-display text-[1.5rem] uppercase tracking-widest text-[var(--clr-ink)]">Review Smart Purge</h3>
                <p className="font-ui text-[12px] text-[var(--clr-dust)] mt-1">Choose the keeper for each duplicate cluster, then fine-tune exactly which artifacts are purged.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {purgeGroups.length === 0 ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-paper)]/50 p-6 text-center">
                    <p className="font-ui text-[13px] text-[var(--clr-dust)]">No duplicate groups detected. Your archive is pristine.</p>
                  </div>
                ) : (
                  purgeGroups.map((group) => {
                    const keptItems = (group.items || []).filter((item: any) => !selectedPurgeIds[item.id]);
                    return (
                    <div key={group.phash} className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-paper)]/35 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-gold-dark)]">Duplicate Cluster</p>
                          <p className="font-ui text-[10px] text-[var(--clr-dust)] mt-1">{keptItems.length} kept • {(group.items?.length || 0) - keptItems.length} selected for purge</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const suggested = (group.items || []).find((item: any) => item.suggested_keep) || group.items?.[0];
                            if (suggested) handleSelectKeepArtifact(group, suggested.id);
                          }}
                          className="rounded-full border border-[var(--clr-aged)] px-3 py-1.5 font-ui text-[9px] font-black uppercase tracking-[0.14em] text-[var(--clr-gold-dark)] hover:border-[var(--clr-gold)] hover:bg-[rgba(184,143,91,0.1)]"
                        >
                          Reset AI Pick
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.items.map((item: any) => {
                          const isKeep = !selectedPurgeIds[item.id];
                          const checked = !!selectedPurgeIds[item.id];
                          return (
                            <div key={item.id} className={`rounded-[var(--radius-sm)] border p-3 transition-colors ${isKeep ? 'border-[var(--clr-success)] bg-[rgba(74,124,89,0.08)]' : 'border-[var(--clr-aged)] bg-[var(--clr-linen)]'}`}>
                              <div className="flex items-start gap-3">
                                <img src={item.url} alt={item.title} className="h-20 w-20 rounded object-cover border border-[var(--clr-aged)]" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-ui text-[12px] font-bold text-[var(--clr-ink)] truncate">{item.title}</p>
                                  <p className="font-ui text-[10px] text-[var(--clr-dust)]">{item.width}x{item.height} • {(item.filesize / (1024 * 1024)).toFixed(2)} MB</p>
                                  <p className="font-ui text-[10px] text-[var(--clr-dust)]">{item.year || 'Undated'}{item.location ? ` • ${item.location}` : ''}</p>
                                  {item.suggested_keep && <p className="font-ui text-[9px] uppercase tracking-widest text-[var(--clr-success)] font-bold mt-1">AI best quality</p>}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectKeepArtifact(group, item.id)}
                                  className={`rounded-full border px-3 py-2 font-ui text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${isKeep ? 'border-[var(--clr-success)] bg-[var(--clr-success)] text-white' : 'border-[var(--clr-aged)] text-[var(--clr-dust)] hover:border-[var(--clr-success)] hover:text-[var(--clr-success)]'}`}
                                >
                                  Keep
                                </button>
                                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2 font-ui text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${checked ? 'border-[var(--clr-danger)] bg-[rgba(139,58,58,0.1)] text-[var(--clr-danger)]' : 'border-[var(--clr-aged)] text-[var(--clr-dust)] hover:border-[var(--clr-danger)] hover:text-[var(--clr-danger)]'}`}>
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5"
                                    checked={checked}
                                    disabled={keptItems.length === 1 && isKeep}
                                    onChange={(e) => handleTogglePurgeArtifact(item.id, e.target.checked)}
                                  />
                                  Purge
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
              <div className="p-5 sm:p-6 border-t border-[var(--clr-aged)] flex items-center justify-between gap-3">
                <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-dust)]">
                  {selectedIdsList.length} purge • {purgeReviewSummary.keptCount} keep • ~{purgeReviewSummary.estimatedMb} MB
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setIsPurgeDialogOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleConfirmSmartPurge} disabled={smartPurgeMutation.isPending || selectedIdsList.length === 0}>
                    {smartPurgeMutation.isPending ? 'PURGING...' : 'CONFIRM PURGE'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

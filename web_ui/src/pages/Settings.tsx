import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AxiosError } from 'axios';
import { User as UserIcon, Bell, Database, ChevronRight, ShieldCheck, Palette } from 'lucide-react';
import { STORAGE_LIMITS, useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import ProfileSection from '../components/settings/ProfileSection';
import NotificationsSection from '../components/settings/NotificationsSection';
import AppearanceSection from '../components/settings/AppearanceSection';
import VaultPrefsSection from '../components/settings/VaultPrefsSection';
import { useTranslation } from '../i18n/LanguageContext';
import { MemberStatus, NotificationPreferences, UserRole } from '../types';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useLeaveVault, useMembers, useTransferVaultOwnership } from '../hooks/useMembers';
import { getApiErrorMessage } from '../services/httpError';
import { useUpdateProfile } from '../hooks/useAuth';
import {
  useCleanupVaultRedundant,
  useUpdateVault,
  useVault,
  useVaultHealthAnalysis,
} from '../hooks/useVaults';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  useNotificationPreferences,
  useTriggerNotificationTest,
  useUpdateNotificationPreferences,
} from '../hooks/useNotificationPreferences';
import { usePushNotifications } from '../hooks/usePushNotifications';
import VaultHealthDialog from '../components/settings/VaultHealthDialog';

const SETTINGS_TABS = ['profile', 'vault', 'notifications', 'appearance'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  pushEnabled: false,
  newUploads: true,
  comments: false,
  treeUpdates: true,
  securityAlerts: true,
  memberJoins: false,
  pushAvailable: false,
};

type VaultQuality = 'balanced' | 'high' | 'original';
type VaultVisibility = 'private' | 'family';
type VaultSettings = {
  quality: VaultQuality;
  defaultVisibility: VaultVisibility;
  safetyWindowMinutes: number;
};

type SettingsConfirmState =
  | { kind: 'leave'; title: string; message: string; confirmLabel: string }
  | { kind: 'transfer'; membershipId: string; title: string; message: string; confirmLabel: string };

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, activeVaultId, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as Record<string, unknown>;
  const requestedTab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined;
  const activeTab: SettingsTab =
    requestedTab && SETTINGS_TABS.includes(requestedTab as SettingsTab) ? (requestedTab as SettingsTab) : 'profile';
  const leaveVaultMutation = useLeaveVault();
  const transferOwnershipMutation = useTransferVaultOwnership();
  const updateProfileMutation = useUpdateProfile();
  const updateVaultMutation = useUpdateVault();
  const cleanupRedundantMutation = useCleanupVaultRedundant();
  const { data: activeVault } = useVault(activeVaultId || '');
  const [isHealthDialogOpen, setIsHealthDialogOpen] = useState(false);
  const [selectedHealthHashes, setSelectedHealthHashes] = useState<string[]>([]);
  const [healthPreview, setHealthPreview] = useState<{
    duplicateItemsCount?: number;
    reclaimableBytes?: number;
  } | null>(null);
  const healthAnalysisQuery = useVaultHealthAnalysis(
    activeVaultId || '',
    activeTab === 'vault' && currentUser?.role === UserRole.ADMIN
  );
  const { data: membersData } = useMembers(
    { status: MemberStatus.ACTIVE },
    { enabled: activeTab === 'vault' }
  );
  const notificationPreferencesQuery = useNotificationPreferences(activeTab === 'notifications');
  const updateNotificationPreferencesMutation = useUpdateNotificationPreferences();
  const triggerNotificationTestMutation = useTriggerNotificationTest();
  const { enablePushNotifications, disablePushNotifications } = usePushNotifications();
  const [selectedTransferMembershipId, setSelectedTransferMembershipId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferPasswordError, setTransferPasswordError] = useState('');
  const [familyNameDraft, setFamilyNameDraft] = useState('');
  const [confirmState, setConfirmState] = useState<SettingsConfirmState | null>(null);

  const members = useMemo(() => {
    if (!membersData) return [];
    return membersData.pages.flatMap(page => page.items);
  }, [membersData]);

  const isVaultOwner = Boolean(activeVault?.isOwner);
  const isAdminInVault = (activeVault?.myRole || currentUser?.role) === UserRole.ADMIN;
  const [formData, setFormData] = useState({ 
    fullName: currentUser?.fullName || '', 
    email: currentUser?.email || '', 
    bio: currentUser?.bio || '',
  });
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  useEffect(() => {
    if (requestedTab === activeTab) return;
    navigate({
      to: '/settings',
      replace: true,
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: activeTab }),
    } as any);
  }, [activeTab, navigate, requestedTab]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: currentUser?.fullName || '',
      email: currentUser?.email || '',
      bio: currentUser?.bio || '',
    }));
  }, [currentUser?.bio, currentUser?.email, currentUser?.fullName]);

  useEffect(() => {
    setFamilyNameDraft(activeVault?.familyName || '');
  }, [activeVault?.familyName]);

  useEffect(() => {
    setVaultSettings({
      quality: (activeVault?.storageQuality || 'high') as VaultQuality,
      defaultVisibility: (activeVault?.defaultVisibility || 'family') as VaultVisibility,
      safetyWindowMinutes: Number(activeVault?.safetyWindowMinutes ?? 60),
    });
  }, [activeVault?.defaultVisibility, activeVault?.safetyWindowMinutes, activeVault?.storageQuality]);

  const [vaultSettings, setVaultSettings] = useState<VaultSettings>({
    quality: 'high' as VaultQuality,
    defaultVisibility: 'family' as VaultVisibility,
    safetyWindowMinutes: 60,
  });

  const notificationPrefs = notificationPreferencesQuery.data || DEFAULT_NOTIFICATION_PREFERENCES;
  const storageLimitGb = currentUser ? STORAGE_LIMITS[currentUser.subscriptionTier] : null;

  const handleVaultUpdate = (key: string, value: unknown) => {
    if (!activeVaultId) {
      toast.error(t.settings.vault.familyName.noVaultSelected);
      return;
    }

    const previousSettings = vaultSettings;
    const nextSettings = { ...vaultSettings, [key]: value };
    setVaultSettings(nextSettings);

    const payload: Record<string, string> = {};
    if (key === 'quality') {
      payload.storageQuality = String(value).toUpperCase();
    }
    if (key === 'defaultVisibility') {
      payload.defaultVisibility = String(value).toUpperCase();
    }
    if (key === 'safetyWindowMinutes') {
      payload.safetyWindowMinutes = String(value);
    }

    updateVaultMutation.mutate(
      {
        vaultId: activeVaultId,
        data: payload,
      },
      {
        onSuccess: () => {
          toast.success(t.settings.vault.toasts.success, { duration: 1500 });
        },
        onError: (error) => {
          setVaultSettings(previousSettings);
          toast.error('Unable to update vault policy', {
            description: getApiErrorMessage(error, 'Please try again.'),
          });
        },
      }
    );
  };

  const handleToggleNotification = async (
    key: keyof NotificationPreferences,
    nextValue: boolean
  ) => {
    if (key === 'pushEnabled') {
      if (nextValue) {
        const result = await enablePushNotifications(true);
        if (!result.ok) {
          if (result.reason === 'permission_denied') {
            toast.error('Browser push permission is required.', {
              description: 'Allow notifications in your browser settings and try again.',
            });
          } else if (result.reason === 'missing_key') {
            toast.error('Push is not configured on the backend.', {
              description: 'Set VAPID keys and retry.',
            });
          } else if (result.reason === 'unsupported') {
            toast.error('This browser does not support push notifications.');
          } else {
            toast.error('Failed to enable browser push notifications.');
          }
          return;
        }
      } else {
        await disablePushNotifications();
      }
    }

    updateNotificationPreferencesMutation.mutate({ [key]: nextValue } as Partial<NotificationPreferences>, {
      onSuccess: () => {
        toast.info(t.settings.notifications.toasts.updated, {
          description: t.settings.notifications.toasts.synced,
          duration: 2000,
        });
      },
    });
  };

  const handleTestNotification = () => {
    triggerNotificationTestMutation.mutate();
  };

  useEffect(() => {
    if (!healthAnalysisQuery.data?.groups) return;
    setSelectedHealthHashes((previous) => {
      if (previous.length) {
        return previous.filter((hash) => healthAnalysisQuery.data?.groups.some((group) => group.hash === hash));
      }
      return healthAnalysisQuery.data.groups.map((group) => group.hash);
    });
  }, [healthAnalysisQuery.data?.groups]);

  const openHealthDialog = () => {
    setIsHealthDialogOpen(true);
    setHealthPreview(null);
    void healthAnalysisQuery.refetch();
  };

  const toggleHealthHash = (hash: string) => {
    setSelectedHealthHashes((previous) =>
      previous.includes(hash) ? previous.filter((value) => value !== hash) : [...previous, hash]
    );
  };

  const runHealthDryRun = () => {
    if (!activeVaultId || !selectedHealthHashes.length) return;
    cleanupRedundantMutation.mutate(
      { vaultId: activeVaultId, groupHashes: selectedHealthHashes, dryRun: true },
      {
        onSuccess: (result) => {
          setHealthPreview({
            duplicateItemsCount: result.duplicateItemsCount || 0,
            reclaimableBytes: result.reclaimableBytes || 0,
          });
        },
      }
    );
  };

  const runHealthCleanup = () => {
    if (!activeVaultId || !selectedHealthHashes.length) return;
    cleanupRedundantMutation.mutate(
      { vaultId: activeVaultId, groupHashes: selectedHealthHashes, dryRun: false },
      {
        onSuccess: (result) => {
          setHealthPreview({
            duplicateItemsCount: result.deletedItemsCount || 0,
            reclaimableBytes: result.recoveredBytes || 0,
          });
          void healthAnalysisQuery.refetch();
        },
      }
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = formData.fullName.trim();
    const bio = formData.bio;
    if (!fullName) {
      toast.error(t.settings.profile.toasts.error || 'Name is required.');
      return;
    }

    updateProfileMutation.mutate(
      { fullName, bio, avatar: selectedAvatar || undefined },
      {
        onSuccess: () => {
          toast.success(t.settings.profile.toasts.success, { icon: <ShieldCheck size={16} className="text-primary" /> });
          setSelectedAvatar(null);
          setAvatarPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (error) => {
          toast.error(t.settings.profile.toasts.error || 'Failed to update profile.', {
            description: getApiErrorMessage(error, t.settings.profile.toasts.errorDesc || 'Please try again.'),
          });
        },
      }
    );
  };

  const handleAvatarChange = (file: File | null) => {
    setSelectedAvatar(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleLeaveVault = () => {
    if (!activeVaultId) {
      toast.error(t.settings.vault.leave.noVaultSelected);
      return;
    }

    setConfirmState({
      kind: 'leave',
      title: 'Leave Vault?',
      message: t.settings.vault.leave.confirmPrompt,
      confirmLabel: 'Leave Vault',
    });
  };

  const closeConfirmModal = () => {
    setConfirmState(null);
    setTransferPassword('');
    setTransferPasswordError('');
  };

  const executeLeaveVault = () => {
    if (!activeVaultId) return;

    leaveVaultMutation.mutate(activeVaultId, {
      onSuccess: () => {
        toast.success(t.settings.vault.leave.success);
      },
      onError: (error) => {
        toast.error(t.settings.vault.leave.error, {
          description: getApiErrorMessage(error, t.settings.vault.leave.errorDesc),
        });
      },
    });
  };

  const transferCandidates = useMemo(() => {
    const currentEmail = currentUser?.email?.toLowerCase();
    return members
      .filter(
        (member) =>
          member.email.toLowerCase() !== currentEmail && member.role === UserRole.CONTRIBUTOR
      )
      .map((member) => ({
        id: member.id,
        label: `${member.fullName} (${member.email})`,
      }));
  }, [members, currentUser?.email]);

  useEffect(() => {
    if (!transferCandidates.length) {
      setSelectedTransferMembershipId('');
      return;
    }
    if (!transferCandidates.some((candidate) => candidate.id === selectedTransferMembershipId)) {
      setSelectedTransferMembershipId(transferCandidates[0].id);
    }
  }, [transferCandidates, selectedTransferMembershipId]);

  const handleTransferOwnership = () => {
    if (!activeVaultId) {
      toast.error(t.settings.vault.transfer.noVaultSelected);
      return;
    }
    if (!selectedTransferMembershipId) {
      toast.error(t.settings.vault.transfer.noTargetSelected);
      return;
    }

    const target = transferCandidates.find((candidate) => candidate.id === selectedTransferMembershipId);
    const targetLabel = target?.label || t.settings.vault.transfer.selectPlaceholder;
    setTransferPassword('');
    setTransferPasswordError('');
    setConfirmState({
      kind: 'transfer',
      membershipId: selectedTransferMembershipId,
      title: 'Transfer Vault Ownership?',
      message: `${t.settings.vault.transfer.confirmPrompt} ${targetLabel}. ${t.settings.vault.transfer.confirmConsequence}`.trim(),
      confirmLabel: 'Transfer Ownership',
    });
  };

  const executeTransferOwnership = (membershipId: string, password: string) => {
    transferOwnershipMutation.mutate({ membershipId, password }, {
      onSuccess: () => {
        updateUser({ role: UserRole.CONTRIBUTOR });
        closeConfirmModal();
        toast.success(t.settings.vault.transfer.success);
        toast.info(t.settings.vault.transfer.roleUpdatedNotice);
        navigate({
          to: '/settings',
          replace: true,
          search: (prev: Record<string, unknown>) => ({ ...prev, tab: 'profile' }),
        } as any);
      },
      onError: (error) => {
        if (error instanceof AxiosError) {
          const passwordError = error.response?.data && typeof error.response.data === 'object'
            ? (error.response.data as Record<string, unknown>).password
            : undefined;
          if (typeof passwordError === 'string') {
            setTransferPasswordError(passwordError);
            return;
          }
          if (Array.isArray(passwordError) && typeof passwordError[0] === 'string') {
            setTransferPasswordError(passwordError[0]);
            return;
          }
        }
        toast.error(t.settings.vault.transfer.error, {
          description: getApiErrorMessage(error, t.settings.vault.transfer.errorDesc),
        });
      },
    });
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;

    if (confirmState.kind === 'leave') {
      executeLeaveVault();
      closeConfirmModal();
      return;
    }

    if (!transferPassword) {
      setTransferPasswordError(t.settings.vault.transfer.passwordRequired);
      return;
    }

    setTransferPasswordError('');
    executeTransferOwnership(confirmState.membershipId, transferPassword);
  };

  const handleSaveFamilyName = () => {
    if (!activeVaultId) {
      toast.error(t.settings.vault.familyName.noVaultSelected);
      return;
    }
    const nextFamilyName = familyNameDraft.trim();
    if (!nextFamilyName) {
      toast.error(t.settings.vault.familyName.required);
      return;
    }

    updateVaultMutation.mutate(
      {
        vaultId: activeVaultId,
        data: { familyName: nextFamilyName },
      },
      {
        onSuccess: () => {
          toast.success(t.settings.vault.familyName.success);
        },
        onError: (error) => {
          toast.error(t.settings.vault.familyName.error, {
            description: getApiErrorMessage(error, t.settings.vault.familyName.errorDesc),
          });
        },
      }
    );
  };

  const items = useMemo(() => [
    { id: 'profile', label: t.settings.tabs.profile, icon: <UserIcon size={18} />, desc: t.settings.profile.fields.name },
    { id: 'vault', label: t.settings.tabs.vault, icon: <Database size={18} />, desc: t.settings.vault.rules },
    { id: 'appearance', label: t.settings.tabs.appearance, icon: <Palette size={18} />, desc: t.settings.appearance.title },
    { id: 'notifications', label: t.settings.tabs.notifications, icon: <Bell size={18} />, desc: t.settings.notifications.subtitle },
  ] as const, [t]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pb-20">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-2">
          {items.map((it) => (
            <button 
              key={it.id} 
              onClick={() =>
                navigate({
                  to: '/settings',
                  search: (prev: Record<string, unknown>) => ({ ...prev, tab: it.id }),
                } as any)
              } 
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border text-left group ${activeTab === it.id ? 'bg-white border-primary shadow-sm dark:bg-slate-900 dark:border-primary/50' : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}
            >
              <div className={`p-2.5 rounded-xl transition-colors ${activeTab === it.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>{it.icon}</div>
              <div className="flex-1 min-w-0"><p className={`text-xs font-bold uppercase tracking-widest ${activeTab === it.id ? 'text-slate-900 dark:text-slate-100' : ''}`}>{it.label}</p><p className="text-[10px] text-slate-400 truncate">{it.desc}</p></div>
              {activeTab === it.id && <ChevronRight size={14} className="text-primary animate-in slide-in-from-left-2" />}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && currentUser && (
            <ProfileSection 
              currentUser={currentUser} 
              formData={formData} 
              isSaving={updateProfileMutation.isPending}
              selectedAvatar={selectedAvatar}
              avatarPreview={avatarPreview}
              onFormChange={u => setFormData(p => ({ ...p, ...u }))} 
              onAvatarChange={handleAvatarChange}
              onSubmit={handleSaveProfile} 
            />
          )}
          {activeTab === 'vault' && (
            <VaultPrefsSection
              settings={vaultSettings}
              storageUsedBytes={activeVault?.storageUsedBytes || 0}
              storageLimitGb={storageLimitGb}
              isUpdatingSettings={updateVaultMutation.isPending}
              onUpdate={handleVaultUpdate}
              familyName={familyNameDraft}
              onFamilyNameChange={setFamilyNameDraft}
              onSaveFamilyName={handleSaveFamilyName}
              isSavingFamilyName={updateVaultMutation.isPending}
              canManage={currentUser?.role === UserRole.ADMIN}
              onLeaveVault={handleLeaveVault}
              isLeaving={leaveVaultMutation.isPending}
              isLeaveDisabled={isAdminInVault}
              leaveDisabledReason={isAdminInVault ? t.settings.vault.leave.adminMustTransferFirst : undefined}
              canTransferOwnership={isVaultOwner}
              transferCandidates={transferCandidates}
              selectedTransferMembershipId={selectedTransferMembershipId}
              onSelectTransferMembership={setSelectedTransferMembershipId}
              onTransferOwnership={handleTransferOwnership}
              isTransferringOwnership={transferOwnershipMutation.isPending}
              isHealthLoading={healthAnalysisQuery.isFetching}
              healthSummary={
                healthAnalysisQuery.data
                  ? {
                      duplicateGroupsCount: healthAnalysisQuery.data.duplicateGroupsCount,
                      duplicateItemsCount: healthAnalysisQuery.data.duplicateItemsCount,
                      reclaimableBytes: healthAnalysisQuery.data.reclaimableBytes,
                    }
                  : null
              }
              onOpenHealthAnalysis={openHealthDialog}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationsSection
              preferences={notificationPrefs}
              isUpdating={notificationPreferencesQuery.isLoading || updateNotificationPreferencesMutation.isPending}
              isTesting={triggerNotificationTestMutation.isPending}
              onToggle={handleToggleNotification}
              onTest={handleTestNotification}
            />
          )}
          {activeTab === 'appearance' && <AppearanceSection />}
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        requirePassword={confirmState?.kind === 'transfer'}
        passwordValue={transferPassword}
        passwordLabel={t.settings.vault.transfer.passwordLabel}
        passwordPlaceholder={t.settings.vault.transfer.passwordPlaceholder}
        passwordError={confirmState?.kind === 'transfer' ? transferPasswordError : ''}
        confirmDisabled={confirmState?.kind === 'transfer' ? !transferPassword : false}
        onPasswordChange={(value) => {
          setTransferPassword(value);
          if (transferPasswordError) {
            setTransferPasswordError('');
          }
        }}
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmModal}
        isPending={leaveVaultMutation.isPending || transferOwnershipMutation.isPending}
      />
      <VaultHealthDialog
        isOpen={isHealthDialogOpen}
        report={healthAnalysisQuery.data}
        isLoading={healthAnalysisQuery.isLoading || healthAnalysisQuery.isFetching}
        isCleaning={cleanupRedundantMutation.isPending}
        preview={healthPreview}
        selectedHashes={selectedHealthHashes}
        onToggleHash={toggleHealthHash}
        onSelectAll={() =>
          setSelectedHealthHashes(healthAnalysisQuery.data?.groups.map((group) => group.hash) || [])
        }
        onClearSelection={() => setSelectedHealthHashes([])}
        onRefresh={() => {
          setHealthPreview(null);
          void healthAnalysisQuery.refetch();
        }}
        onDryRun={runHealthDryRun}
        onCleanupSelected={runHealthCleanup}
        onClose={() => setIsHealthDialogOpen(false)}
      />
    </div>
  );
};

export default Settings;

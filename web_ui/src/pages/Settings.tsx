import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { ShieldCheck } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import AppearanceSection from '@/components/settings/AppearanceSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import ProfileSection from '@/components/settings/ProfileSection';
import VaultHealthDialog from '@/components/settings/VaultHealthDialog';
import VaultPrefsSection from '@/components/settings/VaultPrefsSection';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsTabsNav } from '@/features/settings/components/SettingsTabsNav';
import {
  buildSettingsTabItems,
  buildTransferCandidates,
  buildVaultSettings,
  flattenSettingsMembers,
  getIsAdminInVault,
  getVaultHealthSummary,
  resolveSettingsTab,
  resolveTransferMembershipSelection,
  withSettingsTabSearch,
} from '@/features/settings/selectors';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type SettingsConfirmState,
  type SettingsSearchState,
  type VaultSettings,
} from '@/features/settings/types';
import { useUpdateProfile } from '@/hooks/useAuth';
import { useLeaveVault, useMembers, useTransferVaultOwnership } from '@/hooks/useMembers';
import {
  useNotificationPreferences,
  useTriggerNotificationTest,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  useCleanupVaultRedundant,
  useUpdateVault,
  useVault,
  useVaultHealthAnalysis,
} from '@/hooks/useVaults';
import { useTranslation } from '@/i18n/LanguageContext';
import { getApiErrorMessage } from '@/services/httpError';
import { STORAGE_LIMITS, useAuthStore } from '@/stores/authStore';
import { MemberStatus, type NotificationPreferences, UserRole } from '@/types';

const Settings = () => {
  const { t } = useTranslation();
  const { currentUser, activeVaultId, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as SettingsSearchState;
  const requestedTab = searchParams.tab;
  const activeTab = resolveSettingsTab(requestedTab);
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

  const members = useMemo(() => flattenSettingsMembers(membersData), [membersData]);

  const isVaultOwner = Boolean(activeVault?.isOwner);
  const isAdminInVault = getIsAdminInVault({
    vaultRole: activeVault?.myRole,
    currentUserRole: currentUser?.role,
  });
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
      search: (prev: Record<string, unknown>) => withSettingsTabSearch(prev, activeTab),
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
    setVaultSettings(buildVaultSettings(activeVault));
  }, [activeVault?.defaultVisibility, activeVault?.safetyWindowMinutes, activeVault?.storageQuality]);

  const [vaultSettings, setVaultSettings] = useState<VaultSettings>({
    quality: 'high',
    defaultVisibility: 'family',
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
          toast.error(t.settings.vault.toasts.updateError, {
            description: getApiErrorMessage(error, t.settings.vault.toasts.updateErrorDesc),
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
            toast.error(t.settings.notifications.toasts.pushPermissionRequired, {
              description: t.settings.notifications.toasts.pushPermissionRequiredDesc,
            });
          } else if (result.reason === 'missing_key') {
            toast.error(t.settings.notifications.toasts.pushMissingKey, {
              description: t.settings.notifications.toasts.pushMissingKeyDesc,
            });
          } else if (result.reason === 'unsupported') {
            toast.error(t.settings.notifications.toasts.pushUnsupported);
          } else {
            toast.error(t.settings.notifications.toasts.pushEnableFailed);
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

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    const fullName = formData.fullName.trim();
    const bio = formData.bio;
    if (!fullName) {
      toast.error(t.settings.profile.toasts.error);
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
          toast.error(t.settings.profile.toasts.error, {
            description: getApiErrorMessage(error, t.settings.profile.toasts.errorDesc),
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
      title: t.settings.vault.leave.confirmTitle,
      message: t.settings.vault.leave.confirmPrompt,
      confirmLabel: t.settings.vault.leave.button,
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

  const transferCandidates = useMemo(
    () => buildTransferCandidates(members, currentUser?.email),
    [currentUser?.email, members],
  );

  useEffect(() => {
    const resolvedSelection = resolveTransferMembershipSelection(
      transferCandidates,
      selectedTransferMembershipId,
    );
    if (resolvedSelection !== selectedTransferMembershipId) {
      setSelectedTransferMembershipId(resolvedSelection);
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
      title: t.settings.vault.transfer.confirmTitle,
      message: `${t.settings.vault.transfer.confirmPrompt} ${targetLabel}. ${t.settings.vault.transfer.confirmConsequence}`.trim(),
      confirmLabel: t.settings.vault.transfer.confirmLabel,
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
          search: (prev: Record<string, unknown>) => withSettingsTabSearch(prev, 'profile'),
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

  const items = useMemo(
    () =>
      buildSettingsTabItems({
        profileLabel: t.settings.tabs.profile,
        profileDescription: t.settings.profile.fields.name,
        vaultLabel: t.settings.tabs.vault,
        vaultDescription: t.settings.vault.rules,
        appearanceLabel: t.settings.tabs.appearance,
        appearanceDescription: t.settings.appearance.title,
        notificationsLabel: t.settings.tabs.notifications,
        notificationsDescription: t.settings.notifications.subtitle,
      }),
    [
      t.settings.appearance.title,
      t.settings.notifications.subtitle,
      t.settings.profile.fields.name,
      t.settings.tabs.appearance,
      t.settings.tabs.notifications,
      t.settings.tabs.profile,
      t.settings.tabs.vault,
      t.settings.vault.rules,
    ],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pb-20">
      <SettingsHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <SettingsTabsNav
          activeTab={activeTab}
          items={items}
          onSelectTab={(tab) =>
            navigate({
              to: '/settings',
              search: (prev: Record<string, unknown>) => withSettingsTabSearch(prev, tab),
            } as any)
          }
        />

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
              healthSummary={getVaultHealthSummary(healthAnalysisQuery.data)}
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
        confirmLabel={confirmState?.confirmLabel || t.common.actions.confirm}
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

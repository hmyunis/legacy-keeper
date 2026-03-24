import type { NotificationPreferences, UserRole } from '@/types';

export const SETTINGS_TABS = ['profile', 'vault', 'notifications', 'appearance'] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export type VaultQuality = 'balanced' | 'high' | 'original';
export type VaultVisibility = 'private' | 'family';

export interface VaultSettings {
  quality: VaultQuality;
  defaultVisibility: VaultVisibility;
  safetyWindowMinutes: number;
}

export type SettingsConfirmState =
  | { kind: 'leave'; title: string; message: string; confirmLabel: string }
  | {
      kind: 'transfer';
      membershipId: string;
      title: string;
      message: string;
      confirmLabel: string;
    };

export interface SettingsSearchState {
  tab?: string;
}

export interface TransferCandidate {
  id: string;
  label: string;
}

export type SettingsTabIconKey = 'profile' | 'vault' | 'appearance' | 'notifications';

export interface SettingsTabItem {
  id: SettingsTab;
  label: string;
  description: string;
  iconKey: SettingsTabIconKey;
}

export interface SettingsTabCopy {
  profileLabel: string;
  profileDescription: string;
  vaultLabel: string;
  vaultDescription: string;
  appearanceLabel: string;
  appearanceDescription: string;
  notificationsLabel: string;
  notificationsDescription: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  pushEnabled: false,
  newUploads: true,
  comments: false,
  treeUpdates: true,
  securityAlerts: true,
  memberJoins: false,
  pushAvailable: false,
};

export interface SettingsRoleContext {
  vaultRole?: UserRole | null;
  currentUserRole?: UserRole;
}

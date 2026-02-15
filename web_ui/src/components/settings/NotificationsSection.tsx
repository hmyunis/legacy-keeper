import React from 'react';
import { Bell, Shield, Users, Database, MessageSquare, GitBranch, Terminal, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n/LanguageContext';
import type { NotificationPreferences } from '../../types';

interface NotificationToggleProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (id: string, nextValue: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  id,
  title,
  description,
  icon,
  enabled,
  disabled = false,
  onToggle,
}) => (
  <div className="flex items-start justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all group">
    <div className="flex items-start gap-4">
      <div className={`p-2.5 rounded-xl transition-colors ${enabled ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">{title}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed max-w-[200px] sm:max-w-xs">{description}</p>
      </div>
    </div>
    <button
      disabled={disabled}
      onClick={() => onToggle(id, !enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

interface NotificationsSectionProps {
  preferences: NotificationPreferences;
  isUpdating: boolean;
  isTesting: boolean;
  onToggle: (id: keyof NotificationPreferences, nextValue: boolean) => void;
  onTest: () => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  preferences,
  isUpdating,
  isTesting,
  onToggle,
  onTest,
}) => {
  const { t } = useTranslation();

  const handleTestPush = () => {
    if (!preferences.newUploads) {
      toast.error(t.settings.notifications.toasts.blocked, {
        description: t.settings.notifications.toasts.blockedDesc,
      });
      return;
    }
    onTest();
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-6 sm:p-12 shadow-sm space-y-10 glow-card animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">{t.settings.notifications.title}</h3>
          <p className="text-sm text-slate-500">{t.settings.notifications.subtitle}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl text-primary text-[10px] font-black uppercase">
          <Bell size={16} /> {t.settings.notifications.status}
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.notifications.delivery}</h4>
          <div className="grid grid-cols-1 gap-4">
            <NotificationToggle
              id="inAppEnabled"
              title={t.settings.notifications.inApp}
              description={t.settings.notifications.inAppDesc}
              icon={<Bell size={18} />}
              enabled={preferences.inAppEnabled}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
            <NotificationToggle
              id="pushEnabled"
              title={t.settings.notifications.push}
              description={
                preferences.pushAvailable
                  ? t.settings.notifications.pushDesc
                  : t.settings.notifications.pushUnavailable
              }
              icon={<Smartphone size={18} />}
              enabled={preferences.pushEnabled}
              disabled={isUpdating || !preferences.pushAvailable}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.notifications.memory}</h4>
          <div className="grid grid-cols-1 gap-4">
            <NotificationToggle
              id="newUploads"
              title={t.settings.notifications.newUploads}
              description={t.settings.notifications.newUploadsDesc}
              icon={<Database size={18} />}
              enabled={preferences.newUploads}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
            <NotificationToggle
              id="comments"
              title={t.settings.notifications.comments}
              description={t.settings.notifications.commentsDesc}
              icon={<MessageSquare size={18} />}
              enabled={preferences.comments}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.notifications.lineage}</h4>
          <div className="grid grid-cols-1 gap-4">
            <NotificationToggle
              id="treeUpdates"
              title={t.settings.notifications.tree}
              description={t.settings.notifications.treeDesc}
              icon={<GitBranch size={18} />}
              enabled={preferences.treeUpdates}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.notifications.security}</h4>
          <div className="grid grid-cols-1 gap-4">
            <NotificationToggle
              id="securityAlerts"
              title={t.settings.notifications.alerts}
              description={t.settings.notifications.alertsDesc}
              icon={<Shield size={18} />}
              enabled={preferences.securityAlerts}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
            <NotificationToggle
              id="memberJoins"
              title={t.settings.notifications.activity}
              description={t.settings.notifications.activityDesc}
              icon={<Users size={18} />}
              enabled={preferences.memberJoins}
              disabled={isUpdating}
              onToggle={(id, value) => onToggle(id as keyof NotificationPreferences, value)}
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center gap-4">
        <div className="p-3 bg-primary text-white rounded-2xl">
          <Terminal size={20} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.settings.notifications.technology}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t.settings.notifications.technologyDesc}</p>
        </div>
        <button
          onClick={handleTestPush}
          disabled={isTesting || !preferences.inAppEnabled}
          className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/5 transition-all uppercase tracking-widest disabled:opacity-60"
        >
          {isTesting ? t.settings.notifications.testing : t.settings.notifications.test}
        </button>
      </div>
    </div>
  );
};

export default NotificationsSection;


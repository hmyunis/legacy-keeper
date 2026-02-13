import React, { useState, useMemo, useEffect } from 'react';
import { User as UserIcon, Bell, Database, Download, ChevronRight, ShieldCheck, Palette, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import ProfileSection from '../components/settings/ProfileSection';
import NotificationsSection from '../components/settings/NotificationsSection';
import AppearanceSection from '../components/settings/AppearanceSection';
import VaultPrefsSection from '../components/settings/VaultPrefsSection';
import SubscriptionSection from '../components/settings/SubscriptionSection';
import { useTranslation } from '../i18n/LanguageContext';
import { UserRole } from '../types';
import { useSearch } from '@tanstack/react-router';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, updateUser } = useAuthStore();
  const searchParams = useSearch({ strict: false }) as any;
  const [activeTab, setActiveTab] = useState<'profile' | 'vault' | 'notifications' | 'appearance' | 'subscription'>(searchParams.tab || 'profile');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ fullName: currentUser?.fullName || '', email: currentUser?.email || '', bio: '' });
  
  useEffect(() => {
    if (searchParams.tab) setActiveTab(searchParams.tab);
  }, [searchParams.tab]);

  const [vaultSettings, setVaultSettings] = useState({
    autoTagging: true,
    quality: 'high' as 'original' | 'high' | 'balanced',
    defaultVisibility: 'family' as 'private' | 'family'
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    new_uploads: true,
    comments: false,
    ai_complete: true,
    tree_updates: true,
    security_alerts: true,
    member_joins: false
  });

  const handleVaultUpdate = (key: string, value: any) => {
    setVaultSettings(prev => ({ ...prev, [key]: value }));
    toast.success(t.settings.vault.toasts.success, { duration: 1500 });
  };

  const handleToggleNotification = (id: string) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [id]: !prev[id as keyof typeof prev]
    }));
    toast.info(t.settings.notifications.toasts.updated, {
      description: t.settings.notifications.toasts.synced,
      duration: 2000
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    setTimeout(() => { 
      updateUser({ fullName: formData.fullName, email: formData.email }); 
      setIsSaving(false); 
      toast.success(t.settings.profile.toasts.success, { icon: <ShieldCheck size={16} className="text-primary" /> }); 
    }, 1200);
  };

  const items = useMemo(() => {
    const allItems = [
      { id: 'profile', label: t.settings.tabs.profile, icon: <UserIcon size={18} />, desc: t.settings.profile.fields.name },
      { id: 'subscription', label: 'Subscription', icon: <Zap size={18} />, desc: 'Storage & Plans' },
      { id: 'vault', label: t.settings.tabs.vault, icon: <Database size={18} />, desc: t.settings.vault.rules },
      { id: 'appearance', label: t.settings.tabs.appearance, icon: <Palette size={18} />, desc: t.settings.appearance.title },
      { id: 'notifications', label: t.settings.tabs.notifications, icon: <Bell size={18} />, desc: t.settings.notifications.subtitle },
    ] as const;

    // Contributor and Viewer cannot see Vault Prefs
    if (currentUser?.role === UserRole.CONTRIBUTOR || currentUser?.role === UserRole.VIEWER) {
      return allItems.filter(item => item.id !== 'vault');
    }
    return allItems;
  }, [t, currentUser]);

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
              onClick={() => setActiveTab(it.id as any)} 
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border text-left group ${activeTab === it.id ? 'bg-white border-primary shadow-sm dark:bg-slate-900 dark:border-primary/50' : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}
            >
              <div className={`p-2.5 rounded-xl transition-colors ${activeTab === it.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>{it.icon}</div>
              <div className="flex-1 min-w-0"><p className={`text-xs font-bold uppercase tracking-widest ${activeTab === it.id ? 'text-slate-900 dark:text-slate-100' : ''}`}>{it.label}</p><p className="text-[10px] text-slate-400 truncate">{it.desc}</p></div>
              {activeTab === it.id && <ChevronRight size={14} className="text-primary animate-in slide-in-from-left-2" />}
            </button>
          ))}
          <div className="pt-8 space-y-4">
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm group transition-all hover:border-primary/30">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform"><Download size={18} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest dark:text-slate-300">{t.settings.actions.export}</p>
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Fixed typo: handleSaveSaveProfile -> handleSaveProfile */}
          {activeTab === 'profile' && currentUser && <ProfileSection currentUser={currentUser} formData={formData} isSaving={isSaving} onFormChange={u => setFormData(p => ({ ...p, ...u }))} onSubmit={handleSaveProfile} />}
          {activeTab === 'subscription' && <SubscriptionSection />}
          {activeTab === 'vault' && currentUser?.role === UserRole.ADMIN && <VaultPrefsSection settings={vaultSettings} onUpdate={handleVaultUpdate} />}
          {activeTab === 'notifications' && <NotificationsSection preferences={notificationPrefs} onToggle={handleToggleNotification} />}
          {activeTab === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
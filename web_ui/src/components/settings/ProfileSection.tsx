import React, { useRef } from 'react';
import { Camera, Plus, User as UserIcon, Mail, History, Save, X } from 'lucide-react';
import { User } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface ProfileSectionProps {
  currentUser: User;
  formData: { fullName: string; email: string; bio: string };
  isSaving: boolean;
  selectedAvatar: File | null;
  avatarPreview: string | null;
  onFormChange: (updates: any) => void;
  onAvatarChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ 
  currentUser, formData, isSaving, selectedAvatar, avatarPreview, onFormChange, onAvatarChange, onSubmit 
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        return;
      }
      onAvatarChange(file);
    }
  };

  const handleRemoveAvatar = () => {
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayAvatar = avatarPreview || currentUser.profilePhoto;
  
  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-8 md:p-12 shadow-sm space-y-10 glow-card animate-in slide-in-from-right-4">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-xl relative">
            <img src={displayAvatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Profile" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <Camera className="text-white" size={24} />
            </button>
          </div>
          {selectedAvatar ? (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-900 hover:scale-110 transition-transform hover:bg-rose-600"
            >
              <X size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-primary text-white p-2.5 rounded-2xl shadow-lg border-2 border-white dark:border-slate-900 hover:scale-110 transition-transform"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="text-center md:text-left space-y-2">
          <h3 className="text-xl font-bold">{t.settings.profile.title}</h3>
          <p className="text-sm text-slate-500">{t.settings.profile.desc}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2"><span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase">{currentUser.role} {t.settings.profile.role}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} className="text-primary" /> {t.settings.profile.fields.name}
          </label>
          <input type="text" value={formData.fullName} onChange={(e) => onFormChange({ fullName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/50 border rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Mail size={14} className="text-primary" /> {t.settings.profile.fields.email}
          </label>
          <input type="email" value={formData.email} readOnly className="w-full bg-slate-100 dark:bg-slate-800/50 border rounded-2xl px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-primary" /> {t.settings.profile.fields.bio}
          </label>
          <textarea rows={3} value={formData.bio} onChange={(e) => onFormChange({ bio: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/50 border rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"></textarea>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <button type="submit" disabled={isSaving} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all glow-primary disabled:opacity-50 uppercase tracking-widest">
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t.settings.profile.actions.updating}
            </span>
          ) : (
            <>
              <Save size={16} />{t.settings.profile.actions.submit}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProfileSection;

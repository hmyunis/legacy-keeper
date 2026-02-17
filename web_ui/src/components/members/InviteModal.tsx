import React from 'react';
import { X, Mail, Shield, Check } from 'lucide-react';
import { UserRole } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface InviteModalProps {
  email: string;
  role: UserRole;
  isPending: boolean;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: UserRole) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ email, role, isPending, onEmailChange, onRoleChange, onClose, onSubmit }) => {
  const { t } = useTranslation();

  const roleOptions = [
    { id: UserRole.CONTRIBUTOR, label: t.modals.invite.roles.contributor.label, desc: t.modals.invite.roles.contributor.desc },
    { id: UserRole.VIEWER, label: t.modals.invite.roles.viewer.label, desc: t.modals.invite.roles.viewer.desc },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.modals.invite.title}</h2></div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} /> {t.modals.invite.emailLabel}</label><input autoFocus type="email" required placeholder={t.modals.invite.emailPlaceholder} value={email} onChange={(e) => onEmailChange(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Shield size={12} /> {t.modals.invite.roleLabel}</label>
            <div className="grid grid-cols-1 gap-3">
              {roleOptions.map((r) => (
                <button key={r.id} type="button" onClick={() => onRoleChange(r.id)} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${role === r.id ? 'bg-primary/5 border-primary ring-4 ring-primary/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${role === r.id ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>{role === r.id && <Check size={10} className="text-white" strokeWidth={3} />}</div>
                  <div><p className={`text-sm font-bold ${role === r.id ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>{r.label}</p><p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p></div>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 flex items-center justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">{t.modals.invite.actions.cancel}</button><button type="submit" disabled={isPending} className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-lg glow-primary transition-all disabled:opacity-50 uppercase tracking-widest">{isPending ? t.modals.invite.actions.sending : t.modals.invite.actions.submit}</button></div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;

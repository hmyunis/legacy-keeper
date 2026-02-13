import React, { useState } from 'react';
import { X, UserPlus, BookOpen, Camera, Calendar, MapPin } from 'lucide-react';
import DatePicker from '../DatePicker';
import { useTranslation } from '../../i18n/LanguageContext';

interface AddPersonModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const AddPersonModal: React.FC<AddPersonModalProps> = ({ isPending, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    birthDate: new Date('1950-01-01'),
    deathDate: undefined as Date | undefined,
    birthPlace: '',
    biography: '',
    photoUrl: 'https://picsum.photos/seed/newprofile/200/200'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      birthDate: formData.birthDate.toISOString().split('T')[0],
      deathDate: formData.deathDate?.toISOString().split('T')[0],
    });
  };

  const genderOptions = [
    { id: 'MALE', label: t.modals.addPerson.genders.male },
    { id: 'FEMALE', label: t.modals.addPerson.genders.female }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/40">
          <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.modals.addPerson.title}</h2></div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <img src={formData.photoUrl} className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-50 dark:border-slate-800 shadow-xl group-hover:scale-105 transition-transform" />
              <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900"><Camera size={14} /></button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">{t.modals.addPerson.portrait}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">{t.modals.addPerson.fields.name}</label>
              <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t.modals.addPerson.fields.namePlaceholder} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modals.addPerson.fields.gender}</label>
              <div className="flex p-1 bg-slate-50 dark:bg-slate-800 border rounded-xl">
                {genderOptions.map(g => (
                  <button key={g.id} type="button" onClick={() => setFormData({...formData, gender: g.id as any})} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${formData.gender === g.id ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-primary'}`}>{g.label}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} /> {t.modals.addPerson.fields.birthPlace}</label>
              <input type="text" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t.modals.addPerson.fields.birthPlacePlaceholder} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> {t.modals.addPerson.fields.birthDate}</label>
              <DatePicker date={formData.birthDate} onChange={d => setFormData({...formData, birthDate: d})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> {t.modals.addPerson.fields.deathDate}</label>
              <DatePicker date={formData.deathDate} onChange={d => setFormData({...formData, deathDate: d})} placeholder={t.modals.addPerson.fields.deathPlaceholder} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12} /> {t.modals.addPerson.fields.bio}</label>
              <textarea rows={3} value={formData.biography} onChange={e => setFormData({...formData, biography: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t.modals.addPerson.fields.bioPlaceholder} />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">{t.modals.addPerson.actions.cancel}</button>
            <button type="submit" disabled={isPending} className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-lg glow-primary transition-all disabled:opacity-50 uppercase tracking-widest">
              {isPending ? t.modals.addPerson.actions.archiving : <><UserPlus size={16} /> {t.modals.addPerson.actions.submit}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonModal;
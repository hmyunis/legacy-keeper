import React, { useState, useRef } from 'react';
import { X, UserPlus, BookOpen, Camera, Calendar, MapPin, Upload, ImageIcon } from 'lucide-react';
import DatePicker from '../DatePicker';
import { useTranslation } from '../../i18n/LanguageContext';
import { z } from 'zod';
import { personProfileSchema } from '../../lib/validation';
import { FormInput, FormTextarea } from '../ui/FormError';

type FormData = z.infer<typeof personProfileSchema>;

interface AddPersonModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: { fullName: string; birthDate?: string; deathDate?: string; biography?: string; profilePhoto?: File }) => void;
}

const AddPersonModal: React.FC<AddPersonModalProps> = ({ isPending, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('https://picsum.photos/seed/newprofile/200/200');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: new Date('1950-01-01'),
    deathDate: undefined as Date | undefined,
    biography: '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profilePhoto: 'Image must be less than 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profilePhoto: 'Please select an image file' }));
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, profilePhoto: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      personProfileSchema.parse({
        fullName: formData.fullName,
        birthDate: formData.birthDate?.toISOString().split('T')[0] || null,
        deathDate: formData.deathDate?.toISOString().split('T')[0] || null,
        biography: formData.biography,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof FormData;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    onSubmit({
      fullName: formData.fullName,
      birthDate: formData.birthDate.toISOString().split('T')[0],
      deathDate: formData.deathDate?.toISOString().split('T')[0],
      biography: formData.biography,
      profilePhoto: selectedFile || undefined,
    });
  };

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
              <img 
                src={previewUrl} 
                className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-50 dark:border-slate-800 shadow-xl group-hover:scale-105 transition-transform" 
                alt="Profile preview" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900 hover:bg-primary/90 transition-colors"
              >
                {selectedFile ? <ImageIcon size={14} /> : <Camera size={14} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">{t.modals.addPerson.portrait}</p>
            {selectedFile && (
              <p className="text-[10px] text-primary mt-1">{selectedFile.name}</p>
            )}
            {errors.profilePhoto && (
              <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                <span>{errors.profilePhoto}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {t.modals.addPerson.fields.name} <span className="text-rose-500">*</span>
              </label>
              <FormInput
                type="text"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                placeholder={t.modals.addPerson.fields.namePlaceholder}
                error={errors.fullName}
              />
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
              <FormTextarea
                rows={3}
                value={formData.biography}
                onChange={e => setFormData({...formData, biography: e.target.value})}
                placeholder={t.modals.addPerson.fields.bioPlaceholder}
                error={errors.biography}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors">{t.modals.addPerson.actions.cancel}</button>
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

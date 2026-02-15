
import React, { useEffect, useRef, useState } from 'react';
import { X, Heart, Calendar, MapPin, BookOpen, Share2, Pencil, Camera, ImageIcon, Trash2 } from 'lucide-react';
import { PersonProfile } from '../../types';
import { Link } from '@tanstack/react-router';
import { useTranslation } from '../../i18n/LanguageContext';
import { FormInput, FormTextarea } from '../ui/FormError';
import DatePicker from '../DatePicker';
import { personProfileSchema } from '../../lib/validation';
import { z } from 'zod';
import { format } from 'date-fns';

type FormData = z.infer<typeof personProfileSchema>;
type FormErrors = Partial<Record<keyof FormData | 'profilePhoto', string>>;

export interface ProfileEditPayload {
  fullName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  biography?: string;
  profilePhoto?: File;
}

interface RelativeProfileSidebarProps {
  person: PersonProfile;
  onClose: () => void;
  canEdit?: boolean;
  isPendingUpdate?: boolean;
  onSave?: (profileId: string, data: ProfileEditPayload) => Promise<unknown>;
  isPendingDelete?: boolean;
  onDelete?: (profileId: string) => void;
}

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const RelativeProfileSidebar: React.FC<RelativeProfileSidebarProps> = ({
  person,
  onClose,
  canEdit = false,
  isPendingUpdate = false,
  onSave,
  isPendingDelete = false,
  onDelete,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(person.photoUrl || 'https://placehold.co/200x200?text=Profile');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    fullName: person.fullName,
    birthDate: parseDate(person.birthDate),
    deathDate: parseDate(person.deathDate),
    biography: person.biography || '',
  });

  useEffect(() => {
    setIsEditing(false);
    setSelectedFile(null);
    setErrors({});
    setPreviewUrl(person.photoUrl || 'https://placehold.co/200x200?text=Profile');
    setFormData({
      fullName: person.fullName,
      birthDate: parseDate(person.birthDate),
      deathDate: parseDate(person.deathDate),
      biography: person.biography || '',
    });
  }, [person]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateForm = () => {
    try {
      personProfileSchema.parse({
        fullName: formData.fullName,
        birthDate: formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : undefined,
        deathDate: formData.deathDate ? format(formData.deathDate, 'yyyy-MM-dd') : undefined,
        biography: formData.biography,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: FormErrors = {};
        error.errors.forEach((issue) => {
          const path = issue.path[0] as keyof FormData;
          nextErrors[path] = issue.message;
        });
        setErrors(nextErrors);
      }
      return false;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((previous) => ({ ...previous, profilePhoto: 'Image must be less than 5MB' }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((previous) => ({ ...previous, profilePhoto: 'Please select an image file' }));
      return;
    }

    setSelectedFile(file);
    setErrors((previous) => ({ ...previous, profilePhoto: undefined }));
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setErrors({});
    setPreviewUrl(person.photoUrl || 'https://placehold.co/200x200?text=Profile');
    setFormData({
      fullName: person.fullName,
      birthDate: parseDate(person.birthDate),
      deathDate: parseDate(person.deathDate),
      biography: person.biography || '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onSave || !validateForm()) return;

    try {
      await onSave(person.id, {
        fullName: formData.fullName.trim(),
        birthDate: formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : undefined,
        deathDate: formData.deathDate ? format(formData.deathDate, 'yyyy-MM-dd') : undefined,
        biography: formData.biography,
        profilePhoto: selectedFile || undefined,
      });
      setIsEditing(false);
      setSelectedFile(null);
    } catch {
      // Error toast is handled by the mutation hook.
    }
  };

  const birthYear = person.birthDate ? person.birthDate.split('-')[0] : t.tree.unknown;
  const deathYear = person.deathDate ? person.deathDate.split('-')[0] : t.tree.present;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="h-full w-full md:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
       <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.tree.profile}</h3>
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all flex items-center gap-1.5"
              >
                <Pencil size={12} />
                {t.common.actions.edit}
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-all"><X size={20} /></button>
       </div>

       {isEditing ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <img src={previewUrl} className="w-28 h-28 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl" alt={formData.fullName} />
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
              {selectedFile && <p className="text-[10px] text-primary">{selectedFile.name}</p>}
              {errors.profilePhoto && <p className="text-[10px] text-rose-500">{errors.profilePhoto}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t.modals.addPerson.fields.name} <span className="text-rose-500">*</span>
              </label>
              <FormInput
                value={formData.fullName}
                onChange={(event) => setFormData((previous) => ({ ...previous, fullName: event.target.value }))}
                error={errors.fullName}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {t.modals.addPerson.fields.birthDate}
                </label>
                <DatePicker
                  date={formData.birthDate}
                  onChange={(date) => setFormData((previous) => ({ ...previous, birthDate: date }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {t.modals.addPerson.fields.deathDate}
                </label>
                <DatePicker
                  date={formData.deathDate}
                  onChange={(date) => setFormData((previous) => ({ ...previous, deathDate: date }))}
                  placeholder={t.modals.addPerson.fields.deathPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={12} /> {t.modals.addPerson.fields.bio}
              </label>
              <FormTextarea
                rows={5}
                value={formData.biography}
                onChange={(event) => setFormData((previous) => ({ ...previous, biography: event.target.value }))}
                error={errors.biography}
              />
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isPendingUpdate}
              className="flex-1 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200 transition-all hover:border-primary shadow-sm disabled:opacity-50"
            >
              {t.common.actions.cancel}
            </button>
            <button
              type="submit"
              disabled={isPendingUpdate}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest glow-primary text-center hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isPendingUpdate ? t.tree.savingProfile : t.common.actions.save}
            </button>
          </div>
        </form>
       ) : (
        <>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <img src={person.photoUrl} className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl" alt={person.fullName} />
                {person.isLinkedToUser && <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900"><Heart size={14} fill="currentColor" /></div>}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{person.fullName}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{birthYear} - {deathYear}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={10} /> {t.tree.birth}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{person.birthDate || t.tree.unknown}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={10} /> {t.tree.origin}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{person.birthPlace || t.tree.unknown}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12} /> {t.tree.bio}</h4>
              <div className="relative">
                <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-primary/30"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic pl-4">{person.biography || t.tree.noBio}</p>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3">
            <button className="flex-1 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 hover:border-primary shadow-sm"><Share2 size={14} /> Circulate</button>
            <Link
              to="/vault"
              search={{ person: person.fullName.split(' ')[0] } as any}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest glow-primary text-center hover:opacity-90 shadow-lg shadow-primary/20 flex items-center justify-center"
            >
              View Vault
            </Link>
          </div>
          {canEdit && onDelete && (
            <div className="px-8 pb-8">
              <button
                type="button"
                disabled={isPendingDelete}
                onClick={() => onDelete(person.id)}
                className="w-full py-3 px-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-300 transition-all flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50"
              >
                <Trash2 size={14} /> Remove Profile
              </button>
            </div>
          )}
        </>
       )}
      </div>
    </div>
  );
};

export default RelativeProfileSidebar;

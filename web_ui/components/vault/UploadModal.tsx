import React from 'react';
import { X, Upload, Loader2, Image as ImageIcon, Calendar, MapPin, Tag as TagIcon, AlignLeft } from 'lucide-react';
import DatePicker from '../DatePicker';
import { useTranslation } from '../../i18n/LanguageContext';

interface UploadModalProps {
  isUploading: boolean;
  uploadProgress: number;
  uploadDate: Date | undefined;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  onStartUpload: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ 
  isUploading, uploadProgress, uploadDate, onDateChange, onClose, onStartUpload 
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.modals.upload.title}</h2></div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {!isUploading ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary bg-slate-50/50 dark:bg-slate-950/20 group cursor-pointer">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform"><Upload size={32} /></div>
              <div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.modals.upload.dropzone}</p></div>
            </div>
          ) : (
            <div className="space-y-4 py-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl"><Loader2 size={24} className="text-primary animate-spin" /></div>
                  <div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.modals.upload.processing}</p></div>
                </div>
                <span className="text-xl font-black text-primary">{uploadProgress}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${isUploading ? 'opacity-30 pointer-events-none' : ''}`}>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={12} /> {t.modals.upload.fields.title}</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> {t.modals.upload.fields.date}</label><DatePicker date={uploadDate} onChange={onDateChange} /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} /> {t.modals.upload.fields.location}</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><TagIcon size={12} /> {t.modals.upload.fields.tags}</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlignLeft size={12} /> {t.modals.upload.fields.story}</label><textarea rows={3} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
          </div>
        </div>
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={isUploading} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">{t.modals.upload.actions.cancel}</button>
          <button onClick={onStartUpload} disabled={isUploading} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-xs shadow-lg glow-primary transition-all uppercase tracking-widest">{isUploading ? t.modals.upload.actions.uploading : t.modals.upload.actions.submit}</button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
import React, { useRef } from 'react';
import { X, Upload, Loader2, Image as ImageIcon, Calendar, MapPin, Tag as TagIcon, AlignLeft, File as FileIcon } from 'lucide-react';
import DatePicker from '../DatePicker';
import { useTranslation } from '../../i18n/LanguageContext';

interface UploadModalProps {
  isUploading: boolean;
  uploadProgress: number;
  uploadDate: Date | undefined;
  selectedFiles: File[];
  title: string;
  location: string;
  tags: string;
  story: string;
  onDateChange: (date: Date) => void;
  onFilesChange: (files: File[]) => void;
  onTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onStoryChange: (value: string) => void;
  onClose: () => void;
  onStartUpload: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isUploading,
  uploadProgress,
  uploadDate,
  selectedFiles,
  title,
  location,
  tags,
  story,
  onDateChange,
  onFilesChange,
  onTitleChange,
  onLocationChange,
  onTagsChange,
  onStoryChange,
  onClose,
  onStartUpload,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxFiles = 10;

  const mergeFiles = (incoming: File[]) => {
    if (!incoming.length) return;

    const merged = [...selectedFiles];
    for (const file of incoming) {
      const exists = merged.some(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified,
      );
      if (exists) continue;
      if (merged.length >= maxFiles) break;
      merged.push(file);
    }

    onFilesChange(merged);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files || []);
    mergeFiles(incomingFiles as File[]);
    event.target.value = '';
  };

  const handleRemoveFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onFilesChange(selectedFiles.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.modals.upload.title}</h2></div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {!isUploading ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary bg-slate-50/50 dark:bg-slate-950/20 group cursor-pointer relative overflow-hidden"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform"><Upload size={32} /></div>
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{t.modals.upload.dropzone}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {selectedFiles.length}/{maxFiles} files selected
                </p>
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2"
                      >
                        <FileIcon size={14} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={(event) => handleRemoveFile(event, index)}
                          className="ml-auto text-slate-400 hover:text-rose-500 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
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
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={12} /> {t.modals.upload.fields.title}</label><input type="text" value={title} onChange={(event) => onTitleChange(event.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> {t.modals.upload.fields.date}</label><DatePicker date={uploadDate} onChange={onDateChange} /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} /> {t.modals.upload.fields.location}</label><input type="text" value={location} onChange={(event) => onLocationChange(event.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><TagIcon size={12} /> {t.modals.upload.fields.tags}</label><input type="text" value={tags} onChange={(event) => onTagsChange(event.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlignLeft size={12} /> {t.modals.upload.fields.story}</label><textarea rows={3} value={story} onChange={(event) => onStoryChange(event.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
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


import React from 'react';
import { Heart, Maximize2, Calendar, MapPin, Check, FileText, Music2, Film } from 'lucide-react';
import { MediaItem } from '../../types';

interface MediaCardProps {
  item: MediaItem;
  isSelectionMode: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onToggleSelection: (id: string) => void;
  onSelect: (item: MediaItem) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ 
  item, 
  isSelectionMode, 
  isSelected, 
  isFavorite,
  onToggleSelection, 
  onSelect, 
  onToggleFavorite 
}) => {
  const primaryFile = item.files.find((file) => file.isPrimary) || item.files[0];
  const fileType = primaryFile?.fileType || 'PHOTO';

  return (
    <div 
      onClick={() => isSelectionMode ? onToggleSelection(item.id) : onSelect(item)} 
      className={`bg-white dark:bg-slate-900/60 rounded-[2rem] border overflow-hidden transition-all duration-500 cursor-pointer group glow-card relative ${
        isSelectionMode && isSelected ? 'border-primary ring-4 ring-primary/10 scale-[0.98]' : 'border-slate-100 dark:border-slate-800 hover:shadow-2xl dark:hover:border-primary/30'
      }`}
    >
      {isSelectionMode && (
        <div className="absolute top-4 left-4 z-20">
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-primary border-primary shadow-lg' : 'bg-white/80 dark:bg-slate-800/80 border-slate-300'
          }`}>
            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      )}
      <div className="relative aspect-[4/3] overflow-hidden">
        {fileType === 'PHOTO' && (
          <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.title} />
        )}
        {fileType === 'VIDEO' && primaryFile?.fileUrl && (
          <video src={primaryFile.fileUrl} className="w-full h-full object-cover" muted />
        )}
        {fileType === 'AUDIO' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-300 gap-2">
            <Music2 size={24} className="text-primary" />
            <p className="text-[10px] font-bold px-3 text-center truncate max-w-full">{primaryFile?.originalName || item.title}</p>
          </div>
        )}
        {fileType === 'DOCUMENT' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-300 gap-2">
            <FileText size={24} className="text-primary" />
            <p className="text-[10px] font-bold px-3 text-center truncate max-w-full">{primaryFile?.originalName || item.title}</p>
          </div>
        )}
        
        <button 
          onClick={(e) => onToggleFavorite(e, item.id)}
          className={`absolute top-4 right-4 z-20 p-2.5 rounded-full backdrop-blur-md border transition-all ${
            isFavorite 
              ? 'bg-rose-500 border-rose-400 text-white shadow-lg' 
              : 'bg-white/20 border-white/40 text-white hover:bg-white/40 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {!isSelectionMode && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
             <button className="p-2.5 rounded-full border border-white/50 bg-black/35 backdrop-blur-md text-white shadow-sm transition-all hover:bg-white hover:text-slate-900 hover:border-white/90"><Maximize2 size={18} /></button>
             {fileType === 'VIDEO' && <Film size={18} className="text-white" />}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 truncate">{item.title}</h3>
        <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <Calendar size={12} /> {new Date(item.dateTaken).getFullYear()}
          {item.location && <><MapPin size={12} /> {item.location}</>}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;

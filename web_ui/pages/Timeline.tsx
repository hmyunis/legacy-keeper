
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi } from '../services/mockApi';
import { Download, History, Clock } from 'lucide-react';
import TimelineCard from '../components/timeline/TimelineCard';
import { useTranslation } from '../i18n/LanguageContext';
import { MediaItem } from '../types';
import MediaDetailModal from '../components/vault/MediaDetailModal';
import { useDeleteMedia } from '../hooks/useMedia';

const Timeline: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: media } = useQuery({ queryKey: ['media'], queryFn: mockApi.getMedia });
  const [activeDecade, setActiveDecade] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [tagState, setTagState] = useState({ visible: false, value: '' });
  const deleteMutation = useDeleteMedia();

  const sortedMedia = useMemo(() => [...(media || [])].sort((a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()), [media]);
  const decades = useMemo(() => Array.from(new Set(sortedMedia.map(m => Math.floor(new Date(m.dateTaken).getFullYear() / 10) * 10))).sort().map(d => `${d}s`), [sortedMedia]);
  const filtered = useMemo(() => { if (!activeDecade) return sortedMedia; const start = parseInt(activeDecade, 10); return sortedMedia.filter(m => { const y = new Date(m.dateTaken).getFullYear(); return y >= start && y < (start + 10); }); }, [sortedMedia, activeDecade]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 pb-32 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-2"><div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]"><History size={14} /> {t.timeline.label}</div><h1 className="text-4xl font-black">{t.timeline.title}</h1></div>
        <button className="px-6 py-3 bg-white dark:bg-slate-900 dark:text-slate-100 border dark:border-slate-800 rounded-2xl text-[10px] font-bold flex items-center gap-2 transition-all hover:border-primary shadow-sm"><Download size={16} />{t.timeline.export}</button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 sticky top-20 z-20 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md">
        <button onClick={() => setActiveDecade(null)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border transition-all ${!activeDecade ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 hover:border-primary border-slate-200 dark:border-slate-800'}`}>{t.timeline.allEras}</button>
        {decades.map(d => (<button key={d} onClick={() => setActiveDecade(d)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border transition-all ${activeDecade === d ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 hover:border-primary border-slate-200 dark:border-slate-800'}`}>{d}</button>))}
      </div>

      <div className="relative pt-10">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary via-slate-200 dark:via-slate-800 to-slate-200 dark:to-slate-800 -translate-x-1/2"></div>
        <div className="space-y-20">
          {filtered.map((item, i) => (
            <TimelineCard 
              key={item.id} 
              item={item} 
              isEven={i % 2 === 0} 
              onSelect={() => setSelectedMedia(item)} 
            />
          ))}
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Clock size={14} /> {t.timeline.progress}</div>
        <div className="w-40 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: '65%' }}></div></div>
        <span className="text-[10px] font-black text-primary">1948 - 1995</span>
      </div>

      {selectedMedia && (
        <MediaDetailModal 
          media={selectedMedia} 
          isFavorite={false} 
          isTagInputVisible={tagState.visible} 
          manualTagValue={tagState.value} 
          onClose={() => setSelectedMedia(null)} 
          onToggleFavorite={() => {}} 
          onDelete={(id) => deleteMutation.mutate(id)} 
          onAddTag={(tag) => {
            const updatedMedia = { ...selectedMedia, tags: [...selectedMedia.tags, tag] };
            setSelectedMedia(updatedMedia);
            queryClient.setQueryData(['media'], (prev: MediaItem[]) => prev?.map(m => m.id === selectedMedia.id ? updatedMedia : m));
          }}
          onRemoveTag={(tag) => {
            const updatedMedia = { ...selectedMedia, tags: selectedMedia.tags.filter(t => t !== tag) };
            setSelectedMedia(updatedMedia);
            queryClient.setQueryData(['media'], (prev: MediaItem[]) => prev?.map(m => m.id === selectedMedia.id ? updatedMedia : m));
          }}
          onTagInputChange={(v) => setTagState(s => ({ ...s, value: v }))} 
          setTagInputVisible={(v) => setTagState(s => ({ ...s, visible: v, value: '' }))} 
          onManualTagSubmit={(e) => {
            e?.preventDefault(); if (!tagState.value.trim()) return;
            const updatedMedia = { ...selectedMedia, tags: [...selectedMedia.tags, tagState.value.trim()] };
            setSelectedMedia(updatedMedia);
            queryClient.setQueryData(['media'], (prev: MediaItem[]) => prev?.map(m => m.id === selectedMedia.id ? updatedMedia : m));
            setTagState({ visible: false, value: '' });
          }}
        />
      )}
    </div>
  );
};

export default Timeline;

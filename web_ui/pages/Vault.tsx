
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter as FilterIcon, UploadCloud, Grid, List, CheckSquare, Square, ArrowDownWideNarrow, ChevronDown, Check, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MediaItem, MediaType } from '../types';
import { toast } from 'sonner';
import MediaCard from '../components/vault/MediaCard';
import VaultFilters from '../components/vault/VaultFilters';
import MediaDetailModal from '../components/vault/MediaDetailModal';
import UploadModal from '../components/vault/UploadModal';
import { MediaCardSkeleton } from '../components/Skeleton';
import { useMedia, useDeleteMedia, useBulkDeleteMedia } from '../hooks/useMedia';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../constants';
import { isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

const Vault: React.FC<{ initialSearch?: string, initialAction?: string | null, initialPerson?: string }> = ({ initialSearch = '', initialAction, initialPerson }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filters, setFilters] = useState({ 
    people: [] as string[], 
    locations: [] as string[], 
    era: null as string | null,
    types: [] as MediaType[],
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined
  });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [tagState, setTagState] = useState({ visible: false, value: '' });
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('vault_favorites') || '[]')));
  const [uploadState, setUploadState] = useState({ open: false, uploading: false, progress: 0, date: new Date() });
  const sortRef = useRef<HTMLDivElement>(null);

  const { data: media, isLoading } = useMedia();
  const deleteMutation = useDeleteMedia();
  const bulkDeleteMutation = useBulkDeleteMedia();
  
  const canUpload = currentUser ? hasPermission(currentUser.role, 'UPLOAD_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;

  useEffect(() => {
    if (window.innerWidth >= 1024) setIsFilterExpanded(true);
  }, []);

  useEffect(() => { 
    setSearchQuery(initialSearch); 
    if (initialAction === 'upload' && canUpload) setUploadState(s => ({ ...s, open: true }));
    if (initialPerson) {
      setFilters(prev => ({ ...prev, people: [initialPerson] }));
    }
  }, [initialSearch, initialAction, initialPerson, canUpload]);

  useEffect(() => { localStorage.setItem('vault_favorites', JSON.stringify(Array.from(favorites))); }, [favorites]);
  useEffect(() => {
    const click = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false); };
    document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click);
  }, []);

  const filtered = useMemo(() => {
    if (!media) return [];
    return media.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPeople = filters.people.length === 0 || item.tags.some(t => filters.people.includes(t));
      const matchesLoc = filters.locations.length === 0 || (item.location && filters.locations.some(l => item.location?.includes(l)));
      const matchesEra = !filters.era || new Date(item.dateTaken).getFullYear().toString().startsWith(filters.era.slice(0, 3));
      
      const matchesType = filters.types.length === 0 || filters.types.includes(item.type);
      
      const itemDate = new Date(item.dateTaken);
      const matchesStart = !filters.startDate || isAfter(itemDate, startOfDay(filters.startDate));
      const matchesEnd = !filters.endDate || isBefore(itemDate, endOfDay(filters.endDate));

      return matchesSearch && matchesPeople && matchesLoc && matchesEra && matchesType && matchesStart && matchesEnd;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime();
      if (sortBy === 'oldest') return new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime();
      return a.title.localeCompare(b.title);
    });
  }, [media, searchQuery, filters, sortBy]);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); const next = new Set(favorites);
    if (next.has(id)) { next.delete(id); toast.info(t.vault.feedback.removed); } else { next.add(id); toast.success(t.vault.feedback.added); }
    setFavorites(next);
  };

  const handleBulkDel = async () => {
    if (bulkSelection.size === 0 || !canDelete) return;
    await bulkDeleteMutation.mutateAsync(Array.from(bulkSelection));
    setBulkSelection(new Set());
    setIsSelectionMode(false);
  };

  const handleStartUpload = () => {
    if (uploadState.uploading || !canUpload) return; setUploadState(s => ({ ...s, uploading: true, progress: 0 }));
    const interval = setInterval(() => {
      setUploadState(s => {
        if (s.progress >= 100) { 
          clearInterval(interval); 
          setTimeout(() => { 
            setUploadState(s => ({ ...s, open: false, uploading: false })); 
            toast.success(t.vault.feedback.preserved); 
            queryClient.invalidateQueries({ queryKey: ['media'] }); 
          }, 600); 
          return { ...s, progress: 100 }; 
        }
        return { ...s, progress: s.progress + Math.floor(Math.random() * 25) + 5 };
      });
    }, 400);
  };

  return (
    <div className="space-y-6 pb-20 relative px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold">{t.vault.title}</h1>
          <p className="text-slate-500 text-sm">{isLoading ? t.vault.scanning : `${filtered.length} ${t.vault.subtitle}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canDelete && (
            <button 
              onClick={() => { setIsSelectionMode(!isSelectionMode); setBulkSelection(new Set()); }} 
              className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${isSelectionMode ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {isSelectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
              {isSelectionMode ? t.vault.actions.cancel : t.vault.actions.select}
            </button>
          )}
          <button 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${isFilterExpanded ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <FilterIcon size={14} />{t.vault.actions.filter}
          </button>
          {canUpload && (
            <button 
              onClick={() => setUploadState(s => ({ ...s, open: true }))} 
              className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:opacity-90 glow-primary transition-all shadow-lg shadow-primary/20"
            >
              <UploadCloud size={16} />{t.vault.actions.preserve}
            </button>
          )}
        </div>
      </div>

      {isSelectionMode && bulkSelection.size > 0 && canDelete && (
        <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-[1.5rem] p-4 flex flex-col sm:flex-row items-center justify-between shadow-xl animate-in slide-in-from-top-4 gap-3">
           <span className="text-[10px] font-black text-primary uppercase tracking-widest sm:pl-2">{bulkSelection.size} {t.vault.actions.artifactSelected}</span>
           <div className="flex w-full sm:w-auto gap-2">
             <button onClick={() => setBulkSelection(new Set(filtered.map(m => m.id)))} className="flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors">{t.vault.actions.selectAll}</button>
             <button onClick={handleBulkDel} className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"><Trash2 size={14} /> {t.vault.actions.purge}</button>
           </div>
        </div>
      )}

      {isFilterExpanded && (
        <VaultFilters 
          selectedPeople={filters.people} 
          onPeopleChange={p => setFilters(f => ({ ...f, people: f.people.includes(p) ? f.people.filter(x => x !== p) : [...f.people, p] }))} 
          selectedLocations={filters.locations} 
          onLocationChange={l => setFilters(f => ({ ...f, locations: f.locations.includes(l) ? f.locations.filter(x => x !== l) : [...f.locations, l] }))} 
          selectedEra={filters.era} 
          onEraChange={era => setFilters(f => ({ ...f, era }))} 
          selectedTypes={filters.types}
          onTypeChange={t => setFilters(f => ({ ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t] }))}
          startDate={filters.startDate}
          onStartDateChange={d => setFilters(f => ({ ...f, startDate: d }))}
          endDate={filters.endDate}
          onEndDateChange={d => setFilters(f => ({ ...f, endDate: d }))}
          onClear={() => setFilters({ people: [], locations: [], era: null, types: [], startDate: undefined, endDate: undefined })} 
        />
      )}

      <div className="bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between sticky top-16 sm:top-20 z-10 backdrop-blur-md shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder={t.vault.searchPlaceholder} 
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 dark:text-slate-200" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
             <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={18} /></button>
             <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
          </div>
          <div className="relative" ref={sortRef}>
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent">
              <ArrowDownWideNarrow size={16} />
              <span className="hidden sm:inline">{t.vault.sorting.label}: {sortBy === 'newest' ? t.vault.sorting.newest : sortBy === 'oldest' ? t.vault.sorting.oldest : t.vault.sorting.alphabetical}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSortOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 animate-in slide-in-from-top-2">
                {[
                  { id: 'newest', label: t.vault.sorting.newest },
                  { id: 'oldest', label: t.vault.sorting.oldest },
                  { id: 'title', label: t.vault.sorting.alphabetical }
                ].map(opt => (
                  <button key={opt.id} onClick={() => { setSortBy(opt.id as any); setIsSortOpen(false); }} className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${sortBy === opt.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                    {opt.label}
                    {sortBy === opt.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`grid gap-4 sm:gap-6 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)
        ) : (
          filtered.map((item) => (
            <MediaCard 
              key={item.id} 
              item={item} 
              isSelectionMode={isSelectionMode} 
              isSelected={bulkSelection.has(item.id)} 
              isFavorite={favorites.has(item.id)}
              onToggleSelection={(id) => {
                const next = new Set(bulkSelection);
                if (next.has(id)) next.delete(id); else next.add(id);
                setBulkSelection(next);
              }}
              onSelect={setSelectedMedia}
              onToggleFavorite={toggleFav}
            />
          ))
        )}
      </div>

      {selectedMedia && (
        <MediaDetailModal 
          media={selectedMedia} 
          isFavorite={favorites.has(selectedMedia.id)} 
          isTagInputVisible={tagState.visible} 
          manualTagValue={tagState.value} 
          onClose={() => setSelectedMedia(null)} 
          onToggleFavorite={toggleFav} 
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

      {uploadState.open && canUpload && (
        <UploadModal 
          isUploading={uploadState.uploading} 
          uploadProgress={uploadState.progress} 
          uploadDate={uploadState.date} 
          onDateChange={(d) => setUploadState(s => ({ ...s, date: d }))} 
          onClose={() => setUploadState(s => ({ ...s, open: false }))} 
          onStartUpload={handleStartUpload} 
        />
      )}
    </div>
  );
};

export default Vault;

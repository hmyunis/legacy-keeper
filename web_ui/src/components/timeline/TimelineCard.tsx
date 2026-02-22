import React, { useMemo } from 'react';
import { Maximize, MapPin, Share2, ArrowUpRight } from 'lucide-react';
import { MediaItem } from '../../types';

interface TimelineCardProps {
  item: MediaItem;
  isEven: boolean;
  onSelect?: () => void;
}

interface DeckPerson {
  id: string;
  name: string;
  photoUrl?: string;
  role: 'uploader' | 'relative';
}

const MAX_VISIBLE_AVATARS = 6;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const TimelineCard: React.FC<TimelineCardProps> = ({ item, isEven, onSelect }) => {
  const uploaderName = item.uploaderName?.trim() || 'Vault Member';
  const peopleDeck = useMemo(() => {
    const entries: DeckPerson[] = [];
    const seen = new Set<string>();

    const uploaderId = item.uploaderId || `uploader-${item.id}`;
    const uploaderKey = `uploader:${uploaderId}`;
    entries.push({
      id: uploaderKey,
      name: uploaderName,
      photoUrl: item.uploaderAvatar,
      role: 'uploader',
    });
    seen.add(uploaderId);

    for (const relative of item.linkedRelatives || []) {
      const id = String(relative.id || '').trim();
      const name = String(relative.fullName || '').trim();
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      entries.push({
        id: `relative:${id}`,
        name,
        photoUrl: relative.photoUrl,
        role: 'relative',
      });
    }

    return entries;
  }, [item.id, item.linkedRelatives, item.uploaderAvatar, item.uploaderId, uploaderName]);

  const visiblePeople = peopleDeck.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenPeople = peopleDeck.slice(MAX_VISIBLE_AVATARS);
  const relativeCount = Math.max(0, peopleDeck.length - 1);

  return (
    <div className={`relative flex flex-col items-stretch gap-6 sm:gap-8 md:flex-row md:items-center md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}>
      <div className="absolute left-5 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-primary bg-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)] dark:bg-slate-900 sm:left-8 md:left-1/2"></div>
      
      <div className={`flex w-full pl-10 sm:pl-16 md:w-[calc(50%-2rem)] md:pl-0 ${isEven ? 'justify-start' : 'justify-end'}`}>
        <div className="group glow-card w-full overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/60 sm:rounded-4xl lg:rounded-[2.5rem]">
          <div className="relative aspect-video overflow-hidden">
            <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-2000" alt={item.title} />
            <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/60 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:p-6 md:p-8">
               <button 
                onClick={onSelect}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white/95 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 shadow-lg transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-white/30 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-950"
               >
                <Maximize size={14} /> Full Insight
               </button>
            </div>
            <div className="absolute left-4 top-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-white/90 px-3 py-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:left-6 sm:top-6 sm:rounded-2xl sm:px-4 sm:py-2">
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 sm:text-xl">{new Date(item.dateTaken).getFullYear()}</span>
            </div>
          </div>

          <div className="space-y-3 p-5 sm:space-y-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <MapPin size={12} className="text-primary" />
                {item.location || 'Location Pending'}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-lg bg-slate-50 px-2 py-0.5 text-[8px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h3 
              onClick={onSelect}
              className="cursor-pointer text-lg font-bold leading-tight text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100 sm:text-xl"
            >
              {item.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{item.description}</p>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:pt-6">
              <div className="min-w-0 flex-1 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Added by <span className="text-slate-700 dark:text-slate-200">{uploaderName}</span>
                </p>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {visiblePeople.map((person, index) => (
                      <div
                        key={person.id}
                        className="group/avatar relative"
                        style={{ zIndex: visiblePeople.length - index }}
                      >
                        <div
                          title={person.name}
                          aria-label={person.role === 'uploader' ? `Uploader: ${person.name}` : `Linked relative: ${person.name}`}
                          className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 ring-2 ring-white transition-transform duration-200 group-hover/avatar:-translate-y-0.5 dark:ring-slate-900 ${
                            person.role === 'uploader'
                              ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20'
                              : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {person.photoUrl ? (
                            <img src={person.photoUrl} alt={person.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-tight">{getInitials(person.name)}</span>
                          )}
                        </div>
                        <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 opacity-0 shadow-lg transition-opacity duration-200 group-hover/avatar:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                          {person.name}
                        </div>
                      </div>
                    ))}
                    {hiddenPeople.length > 0 && (
                      <div className="group/more relative">
                        <div
                          title={hiddenPeople.map((person) => person.name).join(', ')}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-[10px] font-black text-slate-600 ring-2 ring-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-900"
                        >
                          +{hiddenPeople.length}
                        </div>
                        <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 opacity-0 shadow-lg transition-opacity duration-200 group-hover/more:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                          {hiddenPeople.length} more
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {relativeCount > 0
                        ? `${relativeCount} linked ${relativeCount === 1 ? 'relative' : 'relatives'}`
                        : 'No linked relatives'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 text-slate-300 transition-colors hover:text-primary">
                  <Share2 size={16} />
                </button>
                <button onClick={onSelect} className="p-2 text-slate-300 transition-colors hover:text-primary">
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:block w-[calc(50%-2rem)]"></div>
    </div>
  );
};

export default TimelineCard;


import React from 'react';
import { Maximize, MapPin, Share2, ArrowUpRight } from 'lucide-react';
import { MediaItem } from '../../types';

interface TimelineCardProps {
  item: MediaItem;
  isEven: boolean;
  onSelect?: () => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ item, isEven, onSelect }) => {
  return (
    <div className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}>
      <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-4 border-primary rounded-full -translate-x-1/2 z-10 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)]"></div>
      
      <div className={`w-full md:w-[calc(50%-2rem)] pl-16 md:pl-0 flex ${isEven ? 'justify-start' : 'justify-end'}`}>
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 w-full group overflow-hidden glow-card">
          <div className="relative aspect-video overflow-hidden">
            <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" alt={item.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
               <button 
                onClick={onSelect}
                className="bg-white text-slate-900 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-lg"
               >
                <Maximize size={14} /> Full Insight
               </button>
            </div>
            <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{new Date(item.dateTaken).getFullYear()}</span>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin size={12} className="text-primary" />{item.location || 'Location Pending'}</div>
              <div className="flex gap-2">{item.tags.slice(0, 2).map(tag => (<span key={tag} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[8px] font-bold text-slate-500 uppercase">{tag}</span>))}</div>
            </div>
            <h3 
              onClick={onSelect}
              className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors cursor-pointer leading-tight"
            >
              {item.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{item.description}</p>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3"><img src={`https://picsum.photos/seed/${item.uploaderId}/100/100`} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" /><div className="flex flex-col"><span className="text-[10px] font-bold uppercase dark:text-slate-400">Archive Guardian</span></div></div>
              <div className="flex gap-1"><button className="p-2 text-slate-300 hover:text-primary transition-colors"><Share2 size={16} /></button><button onClick={onSelect} className="p-2 text-slate-300 hover:text-primary transition-colors"><ArrowUpRight size={16} /></button></div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:block w-[calc(50%-2rem)]"></div>
    </div>
  );
};

export default TimelineCard;

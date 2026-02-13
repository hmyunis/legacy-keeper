
import React from 'react';
import { X, Heart, Calendar, MapPin, BookOpen, Share2 } from 'lucide-react';
import { PersonProfile } from '../../types';
import { Link } from '@tanstack/react-router';

interface RelativeProfileSidebarProps {
  person: PersonProfile;
  onClose: () => void;
}

const RelativeProfileSidebar: React.FC<RelativeProfileSidebarProps> = ({ person, onClose }) => {
  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 animate-in slide-in-from-right duration-500 flex flex-col">
       <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Relative Profile</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-all"><X size={20} /></button>
       </div>

       <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <img src={person.photoUrl} className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl" alt="" />
              {person.isLinkedToUser && <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900"><Heart size={14} fill="currentColor" /></div>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{person.fullName}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{person.birthDate.split('-')[0]} — {person.deathDate ? person.deathDate.split('-')[0] : 'Present'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={10} /> Birth</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{person.birthDate}</p>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={10} /> Origin</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{person.birthPlace || 'Unknown'}</p>
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12} /> Archival Biography</h4>
            <div className="relative">
              <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-primary/30"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic pl-4">{person.biography}</p>
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
    </div>
  );
};

export default RelativeProfileSidebar;

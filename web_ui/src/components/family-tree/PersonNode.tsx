
import React from 'react';
import { PersonProfile } from '../../types';

interface PersonNodeProps {
  person: PersonProfile;
  isActive?: boolean;
  isSelected?: boolean;
  onClick: () => void;
}

const PersonNode: React.FC<PersonNodeProps> = ({ person, isActive, isSelected, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-[1.5rem] transition-all duration-500 flex flex-col items-center relative group ${
      isSelected 
        ? 'bg-primary ring-[12px] ring-primary/10 shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.4)] scale-110 z-10' 
        : isActive 
          ? 'bg-white dark:bg-slate-800 ring-8 ring-primary/20 shadow-2xl scale-105 border-primary border-2 z-10'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary hover:scale-105'
    }`}
  >
    <div className="relative">
      <img 
        src={person.photoUrl} 
        className={`w-16 h-16 rounded-2xl object-cover border-4 shadow-md transition-all ${
          isSelected ? 'border-white dark:border-slate-700' : isActive ? 'border-primary' : 'border-white dark:border-slate-700'
        }`} 
        alt={person.fullName} 
      />
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
          You
        </div>
      )}
      {person.isLinkedToUser && !isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
      )}
    </div>
    <div className="mt-3 text-center min-w-[120px] px-2 pb-1">
      <p className={`text-[10px] font-black leading-tight truncate uppercase tracking-tighter ${isSelected ? 'text-white' : isActive ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
        {person.fullName.split(' ')[0]}
      </p>
      <p className={`text-[8px] font-bold mt-0.5 ${isSelected ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>
        {person.birthDate.split('-')[0]} — {person.deathDate ? person.deathDate.split('-')[0] : 'Now'}
      </p>
    </div>
  </button>
);

export default PersonNode;

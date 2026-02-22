import React from 'react';
import { X, GitMerge, User } from 'lucide-react';
import { PersonProfile, Relationship } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/Select';

interface RelationModalProps {
  profiles?: PersonProfile[];
  relPersonA: string;
  relPersonB: string;
  relType: string;
  isPending: boolean;
  onPersonAChange: (val: string) => void;
  onPersonBChange: (val: string) => void;
  onTypeChange: (val: Relationship['type']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const RelationModal: React.FC<RelationModalProps> = ({ 
  profiles, relPersonA, relPersonB, relType, isPending, onPersonAChange, onPersonBChange, onTypeChange, onClose, onSubmit 
}) => {
  const { t } = useTranslation();

  const relationshipOptions = [
    { id: 'PARENT_OF', label: t.modals.relation.types.parent },
    { id: 'ADOPTIVE_PARENT_OF', label: t.modals.relation.types.adoptiveParent },
    { id: 'SPOUSE_OF', label: t.modals.relation.types.spouse },
    { id: 'SIBLING_OF', label: t.modals.relation.types.sibling }
  ] as const satisfies { id: Relationship['type']; label: string }[];

  const getProfileName = (id: string) => profiles?.find(p => p.id === id)?.fullName || "";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.modals.relation.title}</h2></div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-6">
           <div className="space-y-4">
              <div className="space-x-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modals.relation.personA}</label>
                <Select value={relPersonA} onValueChange={onPersonAChange}>
                  <SelectTrigger className="w-full py-3">
                    <User size={14} className="text-primary mr-2 shrink-0" />
                    <span className={relPersonA ? 'text-slate-700 dark:text-slate-200 truncate' : 'text-slate-400 truncate'}>
                      {getProfileName(relPersonA) || t.modals.relation.placeholder}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <img src={p.photoUrl} className="w-5 h-5 rounded-lg object-cover" alt="" />
                          {p.fullName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center my-2 relative z-10"><div className="p-2 bg-primary text-white rounded-full shadow-lg border-4 border-white dark:border-slate-900"><GitMerge size={16} /></div></div>
              
              <div className="space-x-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modals.relation.personB}</label>
                <Select value={relPersonB} onValueChange={onPersonBChange}>
                  <SelectTrigger className="w-full py-3">
                    <User size={14} className="text-primary mr-2 shrink-0" />
                    <span className={relPersonB ? 'text-slate-700 dark:text-slate-200 truncate' : 'text-slate-400 truncate'}>
                      {getProfileName(relPersonB) || t.modals.relation.placeholder}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <img src={p.photoUrl} className="w-5 h-5 rounded-lg object-cover" alt="" />
                          {p.fullName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>

           <div className="space-y-3"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modals.relation.typeLabel}</label><div className="grid grid-cols-2 gap-2">{relationshipOptions.map(opt => (<button key={opt.id} type="button" onClick={() => onTypeChange(opt.id)} className={`px-2 py-3 rounded-xl text-[10px] font-bold transition-all border ${relType === opt.id ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>{opt.label}</button>))}</div></div>
           
           <div className="pt-4 flex items-center justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">{t.modals.relation.actions.cancel}</button>
             <button type="submit" disabled={isPending || !relPersonA || !relPersonB} className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-lg glow-primary transition-all uppercase tracking-widest disabled:opacity-50">
               {isPending ? t.modals.relation.actions.linking : t.modals.relation.actions.submit}
             </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default RelationModal;

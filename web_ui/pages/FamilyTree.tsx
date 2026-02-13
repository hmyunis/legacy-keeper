
import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, UserPlus, GitMerge } from 'lucide-react';
import { hasPermission } from '../constants';
import { Relationship, PersonProfile } from '../types';
import { toast } from 'sonner';
import PersonNode from '../components/family-tree/PersonNode';
import RelativeProfileSidebar from '../components/family-tree/RelativeProfileSidebar';
import RelationModal from '../components/family-tree/RelationModal';
import AddPersonModal from '../components/family-tree/AddPersonModal';
import { Skeleton } from '../components/Skeleton';
import { useProfiles, useAddProfile } from '../hooks/useProfiles';
import { useRelationships, useAddRelationship } from '../hooks/useRelationships';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';

const TreeSkeleton = () => (
  <div className="flex flex-col items-center gap-16 sm:gap-24 relative min-w-max">
    {[1, 2, 3].map(level => (
      <div key={level} className="flex gap-10 md:gap-24">
        {[1, 2].map(node => (
          <div key={node} className="p-2 rounded-[1.5rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="mt-3 flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const FamilyTree: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [zoom, setZoom] = useState(0.8);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [relState, setRelState] = useState({ a: '', b: '', type: 'PARENT_OF' as 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF' });

  const { data: profiles, isLoading: lp } = useProfiles();
  const { data: relationships, isLoading: lr } = useRelationships();
  const addRelationshipMutation = useAddRelationship();
  const addPersonMutation = useAddProfile();

  const selectedPerson = useMemo(() => profiles?.find(p => p.id === selectedPersonId), [profiles, selectedPersonId]);
  
  const treeLevels = useMemo(() => {
    if (!profiles || !relationships) return [];
    // Basic auto-layering logic for the demo tree
    const layer1 = profiles.filter(p => ['p1', 'p2'].includes(p.id));
    const layer2 = profiles.filter(p => p.id === 'p3');
    const layer3 = profiles.filter(p => ['p4', 'p5'].includes(p.id));
    return [layer1, layer2, layer3].filter(l => l.length > 0);
  }, [profiles, relationships]);

  const handleDefineRelation = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!relState.a || !relState.b || relState.a === relState.b) return toast.error('Invalid link selection'); 
    addRelationshipMutation.mutate({ 
      personAId: relState.a, 
      personBId: relState.b, 
      type: relState.type 
    }, {
      onSuccess: () => {
        setIsRelationModalOpen(false); 
        setRelState({ a: '', b: '', type: 'PARENT_OF' }); 
      }
    }); 
  };

  const handleAddPerson = (data: any) => {
    addPersonMutation.mutate(data, {
      onSuccess: () => setIsAddModalOpen(false)
    });
  };

  const isLoading = lp || lr;

  return (
    <div className="h-full flex flex-col space-y-4 animate-in zoom-in-95 overflow-hidden relative pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.tree.title}</h1><p className="text-slate-500 dark:text-slate-400 text-sm">{isLoading ? '...' : `${profiles?.length} ${t.tree.subtitle}`}</p></div>
        {currentUser && hasPermission(currentUser.role, 'EDIT_TREE') && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:border-primary/50"><UserPlus size={16} className="text-primary" />{t.tree.addRelative}</button>
            <button onClick={() => setIsRelationModalOpen(true)} className="flex-1 sm:flex-none px-4 py-3 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 glow-primary shadow-lg shadow-primary/10"><GitMerge size={16} />{t.tree.linkKin}</button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900/40 rounded-[2rem] sm:rounded-[2.5rem] border dark:border-slate-800 shadow-sm relative overflow-hidden flex min-h-[400px]">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40"></div>
        <div className="flex-1 overflow-auto p-6 sm:p-12 flex flex-col items-center no-scrollbar transition-transform" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
           {isLoading ? (
             <TreeSkeleton />
           ) : (
             <div className="flex flex-col items-center gap-16 sm:gap-24 relative min-w-max">
                {treeLevels.map((level, i) => (
                  <React.Fragment key={i}>
                    <div className="flex gap-10 md:gap-24 relative">
                      {level.map(p => (
                        <PersonNode 
                          key={p.id} 
                          person={p} 
                          isActive={p.fullName === currentUser?.fullName} 
                          isSelected={selectedPersonId === p.id} 
                          onClick={() => setSelectedPersonId(p.id)} 
                        />
                      ))}
                    </div>
                    {i < treeLevels.length - 1 && <div className="w-[1px] h-16 sm:h-24 bg-slate-200 dark:bg-slate-800 -my-8 sm:-my-12"></div>}
                  </React.Fragment>
                ))}
             </div>
           )}
        </div>
        
        <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 flex flex-col gap-2 z-20">
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))} className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"><ZoomIn size={18}/></button>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"><ZoomOut size={18}/></button>
          <button onClick={() => setZoom(window.innerWidth < 640 ? 0.6 : 1)} className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"><Maximize2 size={18}/></button>
        </div>
        
        {selectedPerson && <RelativeProfileSidebar person={selectedPerson} onClose={() => setSelectedPersonId(null)} />}
      </div>

      {isRelationModalOpen && (
        <RelationModal 
          profiles={profiles} 
          relPersonA={relState.a} 
          relPersonB={relState.b} 
          relType={relState.type} 
          isPending={addRelationshipMutation.isPending} 
          onPersonAChange={a => setRelState(s => ({ ...s, a }))} 
          onPersonBChange={b => setRelState(s => ({ ...s, b }))} 
          onTypeChange={t => setRelState(s => ({ ...s, t }))} 
          onClose={() => setIsRelationModalOpen(false)} 
          onSubmit={handleDefineRelation} 
        />
      )}

      {isAddModalOpen && (
        <AddPersonModal 
          isPending={addPersonMutation.isPending} 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={handleAddPerson} 
        />
      )}
    </div>
  );
};

export default FamilyTree;

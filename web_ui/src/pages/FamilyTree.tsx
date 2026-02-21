import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, UserPlus, GitMerge, Sparkles, Trash2 } from 'lucide-react';
import { hasPermission } from '@/config/permissions';
import { Relationship, PersonProfile } from '../types';
import { toast } from 'sonner';
import PersonNode from '../components/family-tree/PersonNode';
import RelativeProfileSidebar, { ProfileEditPayload } from '../components/family-tree/RelativeProfileSidebar';
import RelationModal from '../components/family-tree/RelationModal';
import AddPersonModal from '../components/family-tree/AddPersonModal';
import { Skeleton } from '../components/Skeleton';
import { useAddProfile, useUpdateProfile, useDeleteProfile, ProfileFormData } from '../hooks/useProfiles';
import { useAddRelationship, useDeleteRelationship, useTreeData } from '../hooks/useRelationships';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import ConfirmModal from '../components/ui/ConfirmModal';

type TreeConfirmState =
  | { kind: 'relationship'; relationshipId: string; title: string; message: string; confirmLabel: string }
  | { kind: 'person'; profileId: string; title: string; message: string; confirmLabel: string };

const TreeSkeleton = () => (
  <div className="flex flex-col items-center gap-16 sm:gap-24 relative min-w-max">
    {[1, 2, 3].map(level => (
      <div key={level} className="flex gap-10 md:gap-24">
        {[1, 2].map(node => (
          <div key={node} className="p-2 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
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

const EmptyTreeState: React.FC<{
  title: string;
  description: string;
  cta: string;
  canEdit: boolean;
  onAddRelative: () => void;
}> = ({ title, description, cta, canEdit, onAddRelative }) => (
  <div className="mx-auto my-auto max-w-xl text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-4xl p-8 sm:p-10 shadow-lg backdrop-blur-sm">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
      <Sparkles size={22} />
    </div>
    <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    {canEdit && (
      <button
        type="button"
        onClick={onAddRelative}
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
      >
        <UserPlus size={14} />
        {cta}
      </button>
    )}
  </div>
);

const parentRelationshipTypes = new Set<Relationship['type']>(['PARENT_OF', 'ADOPTIVE_PARENT_OF']);
const sameGenerationTypes = new Set<Relationship['type']>(['SPOUSE_OF', 'SIBLING_OF']);

const birthYearValue = (profile: PersonProfile): number => {
  const year = Number((profile.birthDate || '').split('-')[0]);
  return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER;
};

const sortProfiles = (items: PersonProfile[]): PersonProfile[] =>
  [...items].sort((a, b) => {
    const byYear = birthYearValue(a) - birthYearValue(b);
    if (byYear !== 0) return byYear;
    return a.fullName.localeCompare(b.fullName);
  });

const buildTreeLevels = (profiles: PersonProfile[], relationships: Relationship[]): PersonProfile[][] => {
  if (!profiles.length) return [];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  profiles.forEach((profile) => {
    indegree.set(profile.id, 0);
    children.set(profile.id, []);
  });

  relationships.forEach((relationship) => {
    if (!parentRelationshipTypes.has(relationship.type)) return;
    if (!profileById.has(relationship.personAId) || !profileById.has(relationship.personBId)) return;

    children.get(relationship.personAId)?.push(relationship.personBId);
    indegree.set(relationship.personBId, (indegree.get(relationship.personBId) || 0) + 1);
  });

  const pendingInDegree = new Map(indegree);
  const levelById = new Map<string, number>();
  const queue = Array.from(indegree.entries())
    .filter(([, value]) => value === 0)
    .map(([id]) => id)
    .sort((a, b) => {
      const profileA = profileById.get(a)!;
      const profileB = profileById.get(b)!;
      const byYear = birthYearValue(profileA) - birthYearValue(profileB);
      if (byYear !== 0) return byYear;
      return profileA.fullName.localeCompare(profileB.fullName);
    });

  queue.forEach((id) => levelById.set(id, 0));

  while (queue.length) {
    const currentId = queue.shift()!;
    const parentLevel = levelById.get(currentId) || 0;

    (children.get(currentId) || []).forEach((childId) => {
      const nextLevel = parentLevel + 1;
      const previousLevel = levelById.get(childId);
      if (previousLevel === undefined || nextLevel > previousLevel) {
        levelById.set(childId, nextLevel);
      }

      const nextDegree = (pendingInDegree.get(childId) || 0) - 1;
      pendingInDegree.set(childId, nextDegree);
      if (nextDegree <= 0) {
        queue.push(childId);
      }
    });
  }

  let iterations = 0;
  let didChange = true;
  while (didChange && iterations < profiles.length) {
    didChange = false;
    iterations += 1;

    relationships.forEach((relationship) => {
      if (!sameGenerationTypes.has(relationship.type)) return;
      const levelA = levelById.get(relationship.personAId);
      const levelB = levelById.get(relationship.personBId);
      if (levelA === undefined || levelB === undefined) return;

      const nextLevel = Math.max(levelA, levelB);
      if (levelA !== nextLevel) {
        levelById.set(relationship.personAId, nextLevel);
        didChange = true;
      }
      if (levelB !== nextLevel) {
        levelById.set(relationship.personBId, nextLevel);
        didChange = true;
      }
    });
  }

  profiles.forEach((profile) => {
    if (!levelById.has(profile.id)) {
      levelById.set(profile.id, 0);
    }
  });

  const grouped = new Map<number, PersonProfile[]>();
  profiles.forEach((profile) => {
    const level = levelById.get(profile.id) || 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push(profile);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, members]) => sortProfiles(members));
};

const FamilyTree: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [zoom, setZoom] = useState(0.8);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [relState, setRelState] = useState({ a: '', b: '', type: 'PARENT_OF' as Relationship['type'] });
  const [confirmState, setConfirmState] = useState<TreeConfirmState | null>(null);

  const { data: treeData, isLoading: isTreeDataLoading } = useTreeData();
  const addRelationshipMutation = useAddRelationship();
  const deleteRelationshipMutation = useDeleteRelationship();
  const addPersonMutation = useAddProfile();
  const updatePersonMutation = useUpdateProfile();
  const deletePersonMutation = useDeleteProfile();

  const profiles = treeData?.profiles || [];
  const relationships = treeData?.relationships || [];

  const profileById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const relationRows = useMemo(
    () =>
      relationships.map((relationship) => ({
        ...relationship,
        personAName: profileById.get(relationship.personAId)?.fullName || t.tree.unknown,
        personBName: profileById.get(relationship.personBId)?.fullName || t.tree.unknown,
      })),
    [profileById, relationships, t.tree.unknown],
  );

  const selectedPerson = useMemo(() => profiles?.find(p => p.id === selectedPersonId), [profiles, selectedPersonId]);
  const canEditTree = Boolean(currentUser && hasPermission(currentUser.role, 'EDIT_TREE'));
  const familyName = (treeData?.vault?.familyName || t.tree.defaultFamilyName || 'Family').trim();
  const treeTitle = `${familyName} ${t.tree.title}`;
  
  const treeLevels = useMemo(() => buildTreeLevels(profiles, relationships), [profiles, relationships]);

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

  const handleAddPerson = (data: ProfileFormData) => {
    addPersonMutation.mutate(data, {
      onSuccess: () => setIsAddModalOpen(false)
    });
  };

  const handleUpdatePerson = async (profileId: string, data: ProfileEditPayload) => {
    await updatePersonMutation.mutateAsync({
      profileId,
      data: {
        fullName: data.fullName,
        birthDate: data.birthDate,
        deathDate: data.deathDate,
        biography: data.biography,
        profilePhoto: data.profilePhoto,
      },
    });
  };

  const relationshipLabel = (type: Relationship['type']) => {
    if (type === 'PARENT_OF') return t.modals.relation.types.parent;
    if (type === 'ADOPTIVE_PARENT_OF') return t.modals.relation.types.adoptiveParent;
    if (type === 'SPOUSE_OF') return t.modals.relation.types.spouse;
    return t.modals.relation.types.sibling;
  };

  const handleRemoveRelationship = (relationshipId: string, summary: string) => {
    setConfirmState({
      kind: 'relationship',
      relationshipId,
      title: 'Remove Relationship?',
      message: `Remove relationship: ${summary}?`,
      confirmLabel: 'Remove Relationship',
    });
  };

  const handleRemovePerson = (profileId: string) => {
    const profile = profileById.get(profileId);
    const label = profile?.fullName || 'this profile';
    setConfirmState({
      kind: 'person',
      profileId,
      title: 'Remove Family Profile?',
      message: `Remove ${label} from the family tree?`,
      confirmLabel: 'Remove Profile',
    });
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;

    if (confirmState.kind === 'relationship') {
      deleteRelationshipMutation.mutate(confirmState.relationshipId);
      setConfirmState(null);
      return;
    }

    deletePersonMutation.mutate(confirmState.profileId, {
      onSuccess: () => {
        if (selectedPersonId === confirmState.profileId) {
          setSelectedPersonId(null);
        }
      },
    });
    setConfirmState(null);
  };

  const isLoading = isTreeDataLoading;

  return (
    <div className="min-h-full flex flex-col space-y-4 animate-in zoom-in-95 relative pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{treeTitle}</h1><p className="text-slate-500 dark:text-slate-400 text-sm">{isLoading ? '...' : `${profiles?.length} ${t.tree.subtitle} • ${relationships.length} links`}</p></div>
        {canEditTree && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:border-primary/50"><UserPlus size={16} className="text-primary" />{t.tree.addRelative}</button>
            <button onClick={() => setIsRelationModalOpen(true)} className="flex-1 sm:flex-none px-4 py-3 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 glow-primary shadow-lg shadow-primary/10"><GitMerge size={16} />{t.tree.linkKin}</button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900/40 rounded-4xl sm:rounded-[2.5rem] border dark:border-slate-800 shadow-sm relative overflow-hidden flex min-h-100">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40"></div>
        <div className="flex-1 overflow-auto p-6 sm:p-12 flex flex-col items-center no-scrollbar transition-transform" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
           {isLoading ? (
             <TreeSkeleton />
           ) : profiles.length === 0 ? (
             <EmptyTreeState
               title={t.tree.empty.title}
               description={t.tree.empty.description}
               cta={t.tree.empty.action}
               canEdit={canEditTree}
               onAddRelative={() => setIsAddModalOpen(true)}
             />
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
                    {i < treeLevels.length - 1 && <div className="w-px h-16 sm:h-24 bg-slate-200 dark:bg-slate-800 -my-8 sm:-my-12"></div>}
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
        
        {selectedPerson && (
          <RelativeProfileSidebar
            person={selectedPerson}
            onClose={() => setSelectedPersonId(null)}
            canEdit={canEditTree}
            isPendingUpdate={updatePersonMutation.isPending}
            isPendingDelete={deletePersonMutation.isPending}
            onSave={canEditTree ? handleUpdatePerson : undefined}
            onDelete={canEditTree ? handleRemovePerson : undefined}
          />
        )}
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-4xl sm:rounded-[2.5rem] border dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Mapped Relationships</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{relationRows.length} Total</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : relationRows.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No relationships mapped yet.</p>
        ) : (
          <div className="space-y-2">
            {relationRows.map((relationship) => {
              const summary = `${relationship.personAName} ${relationshipLabel(relationship.type)} ${relationship.personBName}`;
              return (
                <div key={relationship.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 px-4 py-3">
                  <p className="text-xs text-slate-700 dark:text-slate-200">{summary}</p>
                  {canEditTree && (
                    <button
                      type="button"
                      disabled={deleteRelationshipMutation.isPending}
                      onClick={() => handleRemoveRelationship(relationship.id, summary)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
          onTypeChange={t => setRelState(s => ({ ...s, type: t }))} 
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

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState(null)}
        isPending={deleteRelationshipMutation.isPending || deletePersonMutation.isPending}
      />
    </div>
  );
};

export default FamilyTree;

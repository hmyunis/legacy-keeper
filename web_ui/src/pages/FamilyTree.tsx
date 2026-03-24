import { type FormEvent, useCallback, useMemo, useState } from 'react';
import AddPersonModal from '@/components/family-tree/AddPersonModal';
import RelationModal from '@/components/family-tree/RelationModal';
import RelativeProfileSidebar, { type ProfileEditPayload } from '@/components/family-tree/RelativeProfileSidebar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { hasPermission } from '@/config/permissions';
import { TreeHeader } from '@/features/family-tree/components/TreeHeader';
import { TreeRelationshipsPanel } from '@/features/family-tree/components/TreeRelationshipsPanel';
import { TreeViewport } from '@/features/family-tree/components/TreeViewport';
import {
  buildProfileById,
  buildRelationRows,
  buildTreeLevels,
} from '@/features/family-tree/selectors';
import type { TreeConfirmState } from '@/features/family-tree/types';
import {
  type ProfileFormData,
  useAddProfile,
  useDeleteProfile,
  useUpdateProfile,
} from '@/hooks/useProfiles';
import { useAddRelationship, useDeleteRelationship, useTreeData } from '@/hooks/useRelationships';
import { useTranslation } from '@/i18n/LanguageContext';
import { useAuthStore } from '@/stores/authStore';
import type { Relationship } from '@/types';
import { toast } from 'sonner';

const FamilyTree = () => {
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

  const profileById = useMemo(() => buildProfileById(profiles), [profiles]);

  const relationshipLabel = useCallback((type: Relationship['type']) => {
    if (type === 'PARENT_OF') return t.modals.relation.types.parent;
    if (type === 'ADOPTIVE_PARENT_OF') return t.modals.relation.types.adoptiveParent;
    if (type === 'SPOUSE_OF') return t.modals.relation.types.spouse;
    return t.modals.relation.types.sibling;
  }, [
    t.modals.relation.types.adoptiveParent,
    t.modals.relation.types.parent,
    t.modals.relation.types.sibling,
    t.modals.relation.types.spouse,
  ]);

  const relationRows = useMemo(
    () => buildRelationRows({
      relationships,
      profileById,
      unknownLabel: t.tree.unknown,
      relationshipLabel,
    }),
    [profileById, relationshipLabel, relationships, t.tree.unknown],
  );

  const selectedPerson = useMemo(
    () => profiles.find((profile) => profile.id === selectedPersonId),
    [profiles, selectedPersonId],
  );
  const canEditTree = Boolean(currentUser && hasPermission(currentUser.role, 'EDIT_TREE'));
  const familyName = (treeData?.vault?.familyName || t.tree.defaultFamilyName).trim();
  const treeTitle = `${familyName} ${t.tree.title}`;
  const treeSubtitle = isTreeDataLoading
    ? t.tree.loading
    : `${profiles.length} ${t.tree.subtitle} • ${relationships.length} ${t.tree.linksLabel}`;

  const treeLevels = useMemo(() => buildTreeLevels(profiles, relationships), [profiles, relationships]);

  const handleDefineRelation = (e: FormEvent) => { 
    e.preventDefault(); 
    if (!relState.a || !relState.b || relState.a === relState.b) return toast.error(t.tree.feedback.invalidLinkSelection); 
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
        birthPlace: data.birthPlace,
        deathDate: data.deathDate,
        biography: data.biography,
        profilePhoto: data.profilePhoto,
      },
    });
  };

  const handleRemoveRelationship = (relationshipId: string, summary: string) => {
    setConfirmState({
      kind: 'relationship',
      relationshipId,
      title: t.tree.confirm.removeRelationshipTitle,
      message: `${t.tree.confirm.removeRelationshipMessagePrefix} ${summary}?`,
      confirmLabel: t.tree.confirm.removeRelationshipConfirmLabel,
    });
  };

  const handleRemovePerson = (profileId: string) => {
    const profile = profileById.get(profileId);
    const label = profile?.fullName || t.tree.confirm.thisProfile;
    setConfirmState({
      kind: 'person',
      profileId,
      title: t.tree.confirm.removePersonTitle,
      message: `${t.tree.confirm.removePersonMessagePrefix} ${label} ${t.tree.confirm.removePersonMessageSuffix}`,
      confirmLabel: t.tree.confirm.removePersonConfirmLabel,
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
      <TreeHeader
        title={treeTitle}
        subtitle={treeSubtitle}
        canEdit={canEditTree}
        addRelativeLabel={t.tree.addRelative}
        linkKinLabel={t.tree.linkKin}
        onAddRelative={() => setIsAddModalOpen(true)}
        onLinkKin={() => setIsRelationModalOpen(true)}
      />

      <TreeViewport
        isLoading={isLoading}
        profiles={profiles}
        treeLevels={treeLevels}
        selectedPersonId={selectedPersonId}
        currentUserName={currentUser?.fullName}
        canEdit={canEditTree}
        zoom={zoom}
        emptyTitle={t.tree.empty.title}
        emptyDescription={t.tree.empty.description}
        emptyActionLabel={t.tree.empty.action}
        onAddRelative={() => setIsAddModalOpen(true)}
        onSelectPerson={setSelectedPersonId}
        onZoomIn={() => setZoom((current) => Math.min(current + 0.1, 1.5))}
        onZoomOut={() => setZoom((current) => Math.max(current - 0.1, 0.4))}
        onResetZoom={() => setZoom(window.innerWidth < 640 ? 0.6 : 1)}
        sidebar={
          selectedPerson ? (
            <RelativeProfileSidebar
              person={selectedPerson}
              onClose={() => setSelectedPersonId(null)}
              canEdit={canEditTree}
              isPendingUpdate={updatePersonMutation.isPending}
              isPendingDelete={deletePersonMutation.isPending}
              onSave={canEditTree ? handleUpdatePerson : undefined}
              onDelete={canEditTree ? handleRemovePerson : undefined}
            />
          ) : null
        }
      />

      <TreeRelationshipsPanel
        isLoading={isLoading}
        rows={relationRows}
        canEdit={canEditTree}
        isDeleting={deleteRelationshipMutation.isPending}
        title={t.tree.relationships.title}
        totalLabel={t.tree.relationships.totalLabel}
        emptyLabel={t.tree.relationships.empty}
        onRemoveRelationship={handleRemoveRelationship}
      />

      {isRelationModalOpen && (
        <RelationModal
          profiles={profiles}
          relPersonA={relState.a}
          relPersonB={relState.b}
          relType={relState.type}
          isPending={addRelationshipMutation.isPending}
          onPersonAChange={(a) => setRelState((state) => ({ ...state, a }))}
          onPersonBChange={(b) => setRelState((state) => ({ ...state, b }))}
          onTypeChange={(type) => setRelState((state) => ({ ...state, type }))}
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
        confirmLabel={confirmState?.confirmLabel || t.common.actions.confirm}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState(null)}
        isPending={deleteRelationshipMutation.isPending || deletePersonMutation.isPending}
      />
    </div>
  );
};

export default FamilyTree;

import type { Dispatch, FC, SetStateAction } from 'react';
import UploadModal from '@/components/vault/UploadModal';
import type { VaultUploadState } from '@/features/vault/utils';

interface VaultUploadModalContainerProps {
  canUpload: boolean;
  uploadState: VaultUploadState;
  lockTargetCandidates: Array<{
    userId: string;
    fullName: string;
    email: string;
  }>;
  setUploadState: Dispatch<SetStateAction<VaultUploadState>>;
  isUploading: boolean;
  onClose: () => void;
  onStartUpload: () => void;
}

export const VaultUploadModalContainer: FC<VaultUploadModalContainerProps> = ({
  canUpload,
  uploadState,
  lockTargetCandidates,
  setUploadState,
  isUploading,
  onClose,
  onStartUpload,
}) => {
  if (!uploadState.open || !canUpload) return null;

  return (
    <UploadModal
      isUploading={isUploading}
      uploadProgress={uploadState.progress}
      uploadDate={uploadState.date}
      selectedFiles={uploadState.files}
      primaryFileIndex={uploadState.primaryFileIndex}
      title={uploadState.title}
      location={uploadState.location}
      tags={uploadState.tags}
      story={uploadState.story}
      visibility={uploadState.visibility}
      lockRule={uploadState.lockRule}
      lockReleaseAt={uploadState.lockReleaseAt}
      lockTargetUserIds={uploadState.lockTargetUserIds}
      lockTargetCandidates={lockTargetCandidates}
      onDateChange={(date) => setUploadState((state) => ({ ...state, date }))}
      onFilesChange={(files, nextPrimaryFileIndex) =>
        setUploadState((state) => {
          const limitedFiles = files.slice(0, 10);
          const maxPrimaryIndex = Math.max(limitedFiles.length - 1, 0);
          return {
            ...state,
            files: limitedFiles,
            primaryFileIndex:
              typeof nextPrimaryFileIndex === 'number'
                ? Math.max(0, Math.min(nextPrimaryFileIndex, maxPrimaryIndex))
                : Math.min(state.primaryFileIndex, maxPrimaryIndex),
          };
        })
      }
      onPrimaryFileChange={(index) =>
        setUploadState((state) => ({
          ...state,
          primaryFileIndex: Math.max(0, Math.min(index, Math.max(state.files.length - 1, 0))),
        }))
      }
      onTitleChange={(value) => setUploadState((state) => ({ ...state, title: value }))}
      onLocationChange={(value) => setUploadState((state) => ({ ...state, location: value }))}
      onTagsChange={(value) => setUploadState((state) => ({ ...state, tags: value }))}
      onStoryChange={(value) => setUploadState((state) => ({ ...state, story: value }))}
      onVisibilityChange={(value) => setUploadState((state) => ({ ...state, visibility: value }))}
      onLockRuleChange={(value) => setUploadState((state) => ({ ...state, lockRule: value }))}
      onLockReleaseAtChange={(value) => setUploadState((state) => ({ ...state, lockReleaseAt: value }))}
      onLockTargetUserIdsChange={(value) =>
        setUploadState((state) => ({ ...state, lockTargetUserIds: value }))
      }
      onClose={onClose}
      onStartUpload={onStartUpload}
    />
  );
};

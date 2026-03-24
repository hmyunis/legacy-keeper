import { Fragment, type FC, type ReactNode } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import PersonNode from '@/components/family-tree/PersonNode';
import type { PersonProfile } from '@/types';
import { EmptyTreeState } from './EmptyTreeState';
import { TreeSkeleton } from './TreeSkeleton';

interface TreeViewportProps {
  isLoading: boolean;
  profiles: PersonProfile[];
  treeLevels: PersonProfile[][];
  selectedPersonId: string | null;
  currentUserName?: string;
  canEdit: boolean;
  zoom: number;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  onAddRelative: () => void;
  onSelectPerson: (profileId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  sidebar?: ReactNode;
}

export const TreeViewport: FC<TreeViewportProps> = ({
  isLoading,
  profiles,
  treeLevels,
  selectedPersonId,
  currentUserName,
  canEdit,
  zoom,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onAddRelative,
  onSelectPerson,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  sidebar,
}) => (
  <div className="flex-1 bg-white dark:bg-slate-900/40 rounded-4xl sm:rounded-[2.5rem] border dark:border-slate-800 shadow-sm relative overflow-hidden flex min-h-100">
    <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40"></div>
    <div
      className="flex-1 overflow-auto p-6 sm:p-12 flex flex-col items-center no-scrollbar transition-transform"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
    >
      {isLoading ? (
        <TreeSkeleton />
      ) : profiles.length === 0 ? (
        <EmptyTreeState
          title={emptyTitle}
          description={emptyDescription}
          cta={emptyActionLabel}
          canEdit={canEdit}
          onAddRelative={onAddRelative}
        />
      ) : (
        <div className="flex flex-col items-center gap-16 sm:gap-24 relative min-w-max">
          {treeLevels.map((level, index) => (
            <Fragment key={`tree-level-${index}`}>
              <div className="flex gap-10 md:gap-24 relative">
                {level.map((profile) => (
                  <PersonNode
                    key={profile.id}
                    person={profile}
                    isActive={profile.fullName === currentUserName}
                    isSelected={selectedPersonId === profile.id}
                    onClick={() => onSelectPerson(profile.id)}
                  />
                ))}
              </div>
              {index < treeLevels.length - 1 && (
                <div className="w-px h-16 sm:h-24 bg-slate-200 dark:bg-slate-800 -my-8 sm:-my-12"></div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>

    <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 flex flex-col gap-2 z-20">
      <button
        onClick={onZoomIn}
        className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={onZoomOut}
        className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={onResetZoom}
        className="p-3.5 sm:p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary"
      >
        <Maximize2 size={18} />
      </button>
    </div>

    {sidebar}
  </div>
);

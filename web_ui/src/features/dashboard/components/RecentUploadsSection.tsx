import type { FC } from 'react';
import { Image, Plus } from 'lucide-react';
import { MediaCardSkeleton } from '@/components/Skeleton';
import PresignedImage from '@/components/ui/PresignedImage';
import type { MediaItem } from '@/types';

interface RecentUploadsSectionProps {
  title: string;
  viewAllLabel: string;
  isLoading: boolean;
  items: MediaItem[];
  canUpload: boolean;
  onViewAll: () => void;
  onAddMemory: () => void;
  onOpenItem: (mediaId: string) => void;
  onRecoverSignedUrl: (mediaId: string) => void;
}

const EMPTY_VAULT_TITLE = 'Your vault is empty';
const EMPTY_VAULT_DESCRIPTION =
  "Start preserving your family's precious memories by uploading your first photo or video.";
const UPLOAD_FIRST_MEMORY_LABEL = 'Upload First Memory';

export const RecentUploadsSection: FC<RecentUploadsSectionProps> = ({
  title,
  viewAllLabel,
  isLoading,
  items,
  canUpload,
  onViewAll,
  onAddMemory,
  onOpenItem,
  onRecoverSignedUrl,
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between px-2">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <button
        type="button"
        onClick={onViewAll}
        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
      >
        {viewAllLabel}
      </button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => <MediaCardSkeleton key={index} />)
        : items.length === 0
          ? (
            <div className="col-span-full">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                  <Image size={32} className="text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {EMPTY_VAULT_TITLE}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                  {EMPTY_VAULT_DESCRIPTION}
                </p>
                {canUpload && (
                  <button
                    type="button"
                    onClick={onAddMemory}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
                  >
                    <Plus size={18} />
                    {UPLOAD_FIRST_MEMORY_LABEL}
                  </button>
                )}
              </div>
            </div>
            )
          : items.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItem(item.id)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
                <PresignedImage
                  src={item.thumbnailUrl}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={item.title}
                  onRecover={() => onRecoverSignedUrl(item.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 sm:p-4">
                  <p className="text-white text-[10px] sm:text-xs font-bold truncate">{item.title}</p>
                  <p className="text-white/60 text-[8px] sm:text-[10px]">
                    {new Date(item.dateTaken).getFullYear()}
                  </p>
                </div>
              </div>
            </div>
            ))}
    </div>
  </div>
);

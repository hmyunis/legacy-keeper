import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Plus, Trash2, Share2, Heart, MapPin, Download, Loader2, FileText, Music2, Film } from 'lucide-react';
import { MediaItem, PersonProfile } from '../../types';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '@/config/permissions';
import { useCreateMediaTag, useDeleteMediaTag, useMediaTags, useDownloadMedia } from '../../hooks/useMediaTags';
import { toast } from 'sonner';

interface MediaDetailModalProps {
  media: MediaItem;
  relatedMedia?: MediaItem[];
  isFavorite: boolean;
  isTagInputVisible: boolean;
  manualTagValue: string;
  onClose: () => void;
  onSelectRelatedMedia?: (media: MediaItem) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTagInputChange: (val: string) => void;
  setTagInputVisible: (visible: boolean) => void;
  onManualTagSubmit: (e?: React.FormEvent) => void;
}

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  isFavorite,
  isTagInputVisible,
  manualTagValue,
  onClose,
  onToggleFavorite,
  onDelete,
  onTagInputChange,
  onManualTagSubmit,
  onRemoveTag,
  setTagInputVisible,
}) => {
  const [taggingFaceId, setTaggingFaceId] = useState<string | null>(null);
  const [localFaces, setLocalFaces] = useState(media.detectedFaces || []);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { currentUser } = useAuthStore();

  const { data: profilesData } = useProfiles();
  const profiles = useMemo(() => {
    if (!profilesData) return [];
    return profilesData.pages.flatMap(page => page.items);
  }, [profilesData]);

  const { data: mediaTags } = useMediaTags(media.id);
  const createMediaTagMutation = useCreateMediaTag();
  const deleteMediaTagMutation = useDeleteMediaTag();
  const downloadMediaMutation = useDownloadMedia();

  const canEdit = currentUser ? hasPermission(currentUser.role, 'EDIT_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;

  useEffect(() => {
    setLocalFaces(media.detectedFaces || []);
    setTaggingFaceId(null);
    setIsLinkPickerOpen(false);
  }, [media.id, media.detectedFaces]);

  const linkedPersonIds = useMemo(() => new Set((mediaTags || []).map((tag) => tag.personId)), [mediaTags]);

  const linkedProfiles = useMemo(
    () => (profiles || []).filter((profile) => linkedPersonIds.has(profile.id)),
    [linkedPersonIds, profiles]
  );

  const availableProfiles = useMemo(
    () => (profiles || []).filter((profile) => !linkedPersonIds.has(profile.id)),
    [linkedPersonIds, profiles]
  );

  const memoryFiles = useMemo(() => {
    if (media.files?.length) {
      const files = [...media.files];
      files.sort((first, second) => {
        if (first.isPrimary && !second.isPrimary) return -1;
        if (!first.isPrimary && second.isPrimary) return 1;
        return 0;
      });
      return files;
    }

    if (!media.fileUrl) return [];
    return [
      {
        id: `fallback-${media.id}`,
        fileUrl: media.fileUrl,
        fileSize: 0,
        fileType: media.type === 'VIDEO' ? 'VIDEO' : media.type === 'PHOTO' ? 'PHOTO' : 'DOCUMENT',
        originalName: media.title || 'Memory file',
        isPrimary: true,
      },
    ];
  }, [media]);

  const activeFile = useMemo(() => {
    if (!memoryFiles.length) return null;
    if (activeFileId) {
      const matched = memoryFiles.find((file) => file.id === activeFileId);
      if (matched) return matched;
    }
    return memoryFiles.find((file) => file.isPrimary) || memoryFiles[0];
  }, [activeFileId, memoryFiles]);

  useEffect(() => {
    if (!memoryFiles.length) {
      setActiveFileId(null);
      return;
    }
    const primary = memoryFiles.find((file) => file.isPrimary) || memoryFiles[0];
    setActiveFileId(primary.id);
  }, [media.id, memoryFiles]);

  const handleDownload = () => {
    const targetUrl = activeFile?.fileUrl || media.fileUrl;
    if (!targetUrl) return;
    downloadMediaMutation.mutate({
      mediaItem: { ...media, fileUrl: targetUrl },
      fileName: activeFile?.originalName || undefined,
    });
  };

  const copyShareLink = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  };

  const handleShare = async () => {
    const shareUrl = activeFile?.fileUrl || media.fileUrl;
    if (!shareUrl) {
      toast.error('No file link available to share.');
      return;
    }

    const shareData: ShareData = {
      title: media.title || 'Memory',
      text: activeFile?.originalName || 'Shared memory file',
      url: shareUrl,
    };

    setIsSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
          const copied = await copyShareLink(shareUrl);
          if (!copied) throw new Error('Copy failed');
          toast.success('Link copied to clipboard');
          return;
        }

        await navigator.share(shareData);
        return;
      }

      const copied = await copyShareLink(shareUrl);
      if (!copied) throw new Error('Copy failed');
      toast.success('Link copied to clipboard');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      toast.error('Unable to share right now. Try copying the link manually.');
    } finally {
      setIsSharing(false);
    }
  };

  const linkProfileToFace = (faceId: string, profile: PersonProfile) => {
    if (!canEdit) return;

    if (linkedPersonIds.has(profile.id)) {
      setLocalFaces((prev) =>
        prev.map((face) => (face.id === faceId ? { ...face, personId: profile.id, name: profile.fullName } : face))
      );
      setTaggingFaceId(null);
      toast.info('Relative already linked to this media');
      return;
    }

    createMediaTagMutation.mutate(
      {
        mediaId: media.id,
        personId: profile.id,
      },
      {
        onSuccess: () => {
          setLocalFaces((prev) =>
            prev.map((face) => (face.id === faceId ? { ...face, personId: profile.id, name: profile.fullName } : face))
          );
          setTaggingFaceId(null);
        },
      }
    );
  };

  const linkProfileToMedia = (profile: PersonProfile) => {
    if (!canEdit || linkedPersonIds.has(profile.id)) return;

    createMediaTagMutation.mutate(
      {
        mediaId: media.id,
        personId: profile.id,
      },
      {
        onSuccess: () => {
          setIsLinkPickerOpen(false);
        },
      }
    );
  };

  const unlinkProfileFromMedia = (profile: PersonProfile) => {
    if (!canEdit || !mediaTags) return;
    const matchingTag = mediaTags.find((tag) => tag.personId === profile.id);
    if (!matchingTag) return;

    deleteMediaTagMutation.mutate(
      { tagId: matchingTag.id, mediaId: media.id },
      {
        onSuccess: () => {
          setLocalFaces((prev) =>
            prev.map((face) =>
              face.personId === profile.id ? { ...face, personId: undefined, name: undefined } : face
            )
          );
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center group p-4 border-r border-slate-100 dark:border-slate-800">
          {activeFile?.fileType === 'PHOTO' && (
            <img src={activeFile.fileUrl} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg" alt={activeFile.originalName} />
          )}
          {activeFile?.fileType === 'VIDEO' && (
            <video
              src={activeFile.fileUrl}
              controls
              className="max-w-full max-h-[80vh] rounded-xl shadow-lg bg-black"
            />
          )}
          {activeFile?.fileType === 'AUDIO' && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Music2 size={20} className="text-primary" />
                <p className="font-semibold truncate">{activeFile.originalName}</p>
              </div>
              <audio src={activeFile.fileUrl} controls className="w-full" />
            </div>
          )}
          {activeFile?.fileType === 'DOCUMENT' && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
              <FileText size={28} className="mx-auto text-primary" />
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{activeFile.originalName}</p>
              <a
                href={activeFile.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest hover:border-primary"
              >
                Open File
              </a>
            </div>
          )}
          {!activeFile && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
              <p className="text-sm text-slate-500">No preview available.</p>
            </div>
          )}

        </div>

        <div className="w-full md:w-112.5 flex flex-col h-full bg-white dark:bg-slate-900">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{media.title}</h2>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {new Date(media.dateTaken).toLocaleString()}
                </p>
                {media.location && (
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} /> {media.location}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
            {memoryFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Files In This Memory ({memoryFiles.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {memoryFiles.map((file) => {
                    const isActiveItem = file.id === activeFile?.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setActiveFileId(file.id)}
                        disabled={isActiveItem}
                        className={`w-full text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all ${
                          isActiveItem
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary/60'
                        }`}
                      >
                        <div className="h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                          {file.fileType === 'PHOTO' && (
                            <img src={file.fileUrl} alt={file.originalName} className="h-full w-full object-cover" />
                          )}
                          {file.fileType === 'VIDEO' && <Film size={18} className="text-primary" />}
                          {file.fileType === 'AUDIO' && <Music2 size={18} className="text-primary" />}
                          {file.fileType === 'DOCUMENT' && <FileText size={18} className="text-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                            {file.originalName}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {file.fileType}
                          </p>
                        </div>
                        {isActiveItem && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                            Viewing
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {localFaces.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Tagged Figures ({localFaces.length})</h3>
                <div className="grid grid-cols-4 gap-4">
                  {localFaces.map((face) => (
                    <div key={face.id} className="relative group/face">
                      <button
                        onClick={() => canEdit && setTaggingFaceId(taggingFaceId === face.id ? null : face.id)}
                        className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${face.personId ? 'border-primary shadow-md' : 'border-slate-200 dark:border-slate-800'}`}
                      >
                        <img src={face.thumbnailUrl} className="w-full h-full object-cover" alt="Face" />
                      </button>
                      {face.name && <p className="text-[8px] font-bold text-center mt-1 truncate uppercase text-slate-500">{face.name.split(' ')[0]}</p>}
                      {taggingFaceId === face.id && canEdit && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 min-w-50 animate-in slide-in-from-top-2">
                          {profiles?.map((profile) => (
                            <button key={profile.id} onClick={() => linkProfileToFace(face.id, profile)} className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                              <img src={profile.photoUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{profile.fullName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Relatives ({linkedProfiles.length})</h3>
              <div className="flex flex-wrap gap-2">
                {linkedProfiles.map((profile) => (
                  <span key={profile.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {profile.fullName}
                    {canEdit && (
                      <button onClick={() => unlinkProfileFromMedia(profile)} className="text-slate-300 hover:text-rose-500">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {canEdit && (
                  <button
                    onClick={() => setIsLinkPickerOpen((open) => !open)}
                    className="px-3 py-1.5 flex gap-1.5 items-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all"
                  >
                    <Plus size={12} /> Link Relative
                  </button>
                )}
              </div>
              {canEdit && isLinkPickerOpen && (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-40 overflow-y-auto no-scrollbar">
                  {availableProfiles.length === 0 ? (
                    <p className="text-[10px] text-slate-500 px-2 py-1">All relatives are already linked.</p>
                  ) : (
                    availableProfiles.map((profile) => (
                      <button key={profile.id} onClick={() => linkProfileToMedia(profile)} className="w-full flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                        <img src={profile.photoUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{profile.fullName}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">The Story</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                {media.description || 'No archival story recorded.'}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preservation Tags</h3>
              <div className="flex flex-wrap gap-2">
                {media.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {tag}
                    {canEdit && <button onClick={() => onRemoveTag(tag)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>}
                  </span>
                ))}
                {canEdit && (
                  <button onClick={() => setTagInputVisible(true)} className="px-3 flex gap-1.5 items-center py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all">
                    <Plus size={12} /> Add Tag
                  </button>
                )}
              </div>
              {canEdit && isTagInputVisible && (
                <form onSubmit={onManualTagSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    autoFocus
                    value={manualTagValue}
                    onChange={(event) => onTagInputChange(event.target.value)}
                    placeholder="Enter a tag"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setTagInputVisible(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-3">
            <button
              onClick={(e) => onToggleFavorite(e, media.id)}
              className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                isFavorite ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary'
              }`}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Essential' : 'Mark Essential'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={downloadMediaMutation.isPending}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all disabled:opacity-50"
              title="Download original file"
            >
              {downloadMediaMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all disabled:opacity-50"
              title="Share file link"
            >
              <Share2 size={18} />
            </button>
            {canDelete && <button onClick={() => onDelete(media.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailModal;

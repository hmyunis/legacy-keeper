
import React, { useState } from 'react';
import { X, Calendar, ShieldCheck, Tag as TagIcon, Plus, Trash2, Share2, Heart, MapPin } from 'lucide-react';
import { MediaItem, PersonProfile } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../../services/mockApi';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '../../constants';

interface MediaDetailModalProps {
  media: MediaItem;
  isFavorite: boolean;
  isTagInputVisible: boolean;
  manualTagValue: string;
  onClose: () => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTagInputChange: (val: string) => void;
  setTagInputVisible: (visible: boolean) => void;
  onManualTagSubmit: (e?: React.FormEvent) => void;
}

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ 
  media, isFavorite, onClose, onToggleFavorite, onDelete, onRemoveTag, setTagInputVisible
}) => {
  const [taggingFaceId, setTaggingFaceId] = useState<string | null>(null);
  const [localFaces, setLocalFaces] = useState(media.detectedFaces || []);
  const { currentUser } = useAuthStore();
  
  const { data: profiles } = useQuery({ 
    queryKey: ['profiles'], 
    queryFn: mockApi.getProfiles 
  });

  const canEdit = currentUser ? hasPermission(currentUser.role, 'EDIT_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;

  const handleLinkProfile = (faceId: string, profile: PersonProfile) => {
    if (!canEdit) return;
    setLocalFaces(prev => prev.map(f => f.id === faceId ? { ...f, personId: profile.id, name: profile.fullName } : f));
    setTaggingFaceId(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        
        {/* Left Side: Media Display */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center group p-4 border-r border-slate-100 dark:border-slate-800">
          <img src={media.thumbnailUrl} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg" alt={media.title} />
          
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 pointer-events-none">
              <ShieldCheck size={14} className="text-primary" /> Secure Vault
            </div>
          </div>
        </div>

        {/* Right Side: Metadata */}
        <div className="w-full md:w-[450px] flex flex-col h-full bg-white dark:bg-slate-900">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{media.title}</h2>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {new Date(media.dateTaken).toLocaleDateString()}
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
            {/* Figures Section */}
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
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 min-w-[200px] animate-in slide-in-from-top-2">
                          {profiles?.map(p => (
                            <button key={p.id} onClick={() => handleLinkProfile(face.id, p)} className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                              <img src={p.photoUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{p.fullName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">The Story</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                {media.description || "No archival story recorded."}
              </p>
            </div>

            {/* Tags Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preservation Tags</h3>
              <div className="flex flex-wrap gap-2">
                {media.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {tag}
                    {canEdit && <button onClick={() => onRemoveTag(tag)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>}
                  </span>
                ))}
                {canEdit && (
                  <button onClick={() => setTagInputVisible(true)} className="px-3 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all">
                    <Plus size={12} /> Add Tag
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-3">
            <button 
              onClick={(e) => onToggleFavorite(e, media.id)}
              className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                isFavorite ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary'
              }`}
            >
              <Heart size={14} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? 'Essential' : 'Mark Essential'}
            </button>
            <button className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all"><Share2 size={18} /></button>
            {canDelete && <button onClick={() => onDelete(media.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailModal;

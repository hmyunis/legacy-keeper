import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagicWand, ShareNetwork, Sparkle, TreeStructure, Quotes, BookOpen, MapPin, Plus, Trash, X, Printer, Heart, SpeakerHigh, SpeakerX
} from '@phosphor-icons/react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { TornEdge } from '../components/ui/TornEdge';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import MemoryCard from '../components/vault/MemoryCard';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useGenerateStory } from '../features/chronicles/hooks/useChronicles';
import { chroniclesService } from '../features/chronicles/api/chronicles.service';
import { useAuthStore } from '../stores/authStore';
import { pollTask } from '../lib/tasks';
import { buildPersonShareUrl } from '../lib/deepLinks';
import axiosClient from '../services/axiosClient';
import type { PersonProfile as PersonProfileType } from '../features/chronicles/types';

export default function PersonProfile() {
  const CHRONICLE_LOADING_LINES = [
    'Dusting the archives',
    'Unsealing forgotten letters',
    'Tracing ancestral footsteps',
    'Threading names through time',
    'Binding memory fragments',
    'Restoring faded chapters',
    'Illuminating hidden lineage',
    'Cataloging family echoes',
    'Etching the chronicle',
    'Weaving a legacy tapestry',
  ];

  const [activeTab, setActiveTab] = useState<'CHRONICLE' | 'CONNECTIONS' | 'MEMORIES'>('CHRONICLE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [chronicleLineIndex, setChronicleLineIndex] = useState(0);
  const [chronicleDots, setChronicleDots] = useState(3);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isSpeakingBio, setIsSpeakingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');

  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const speechChunksRef = useRef<string[]>([]);
  const speechIndexRef = useRef(0);

  const { personId } = useParams({ strict: false });
  const vaultId = useAuthStore(s => s.activeVaultId);
  const currentUser = useAuthStore(s => s.currentUser);
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';
  const queryClient = useQueryClient();
  const generateStoryMutation = useGenerateStory();
  const navigate = useNavigate();

  const { data: profile } = useQuery<PersonProfileType>({
    queryKey: ['personProfile', personId],
    queryFn: () => chroniclesService.getPersonProfile(vaultId!, personId as string),
    enabled: !!vaultId && !!personId,
  });
  const isForeignProfile = Boolean(profile?.vaultId && vaultId && profile.vaultId !== vaultId);
  const canEditProfile = canContribute && !isForeignProfile;

  const { data: allVaultMemories = [] } = useQuery({
    queryKey: ['allVaultMemories', vaultId],
    queryFn: async () => {
      const res = await axiosClient.get(`/vaults/${vaultId}/memories/`, { params: { limit: 1000 } });
      return res.data?.results || res.data || [];
    },
    enabled: isLinkModalOpen && !!vaultId,
  });

  useEffect(() => {
    if (profile?.active_story_task_id && !isGenerating) {
      setIsGenerating(true);
      void handlePoll(profile.active_story_task_id)
        .then(() => {
          sileo.success({ title: 'Story Woven', description: 'The chronicle is ready for presentation.' });
        })
        .catch(() => {
          sileo.error({ title: 'Story Weaver Failed', description: 'The biography weave failed. Please try again in a moment.' });
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
    if (profile) {
      setEditedBio(profile.biography || '');
      setIsComplete(Boolean(profile.biography));
    }
  }, [profile?.active_story_task_id, profile]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [personId]);

  useEffect(() => {
    if (!isGenerating) {
      setChronicleLineIndex(0);
      setChronicleDots(3);
      return;
    }

    const lineTimer = window.setInterval(() => {
      setChronicleLineIndex((prev) => (prev + 1) % CHRONICLE_LOADING_LINES.length);
    }, 1700);

    const dotsTimer = window.setInterval(() => {
      setChronicleDots((prev) => (prev % 3) + 1);
    }, 420);

    return () => {
      window.clearInterval(lineTimer);
      window.clearInterval(dotsTimer);
    };
  }, [isGenerating]);

  const handlePoll = async (taskId: string) => {
    await pollTask(taskId);
    queryClient.invalidateQueries({ queryKey: ['personProfile', personId] });
    setIsComplete(true);
  };

  const generateChronicle = async () => {
    if (isGenerating || generateStoryMutation.isPending) return;

    setIsEditingBio(false);
    setIsGenerating(true);

    const chroniclePromise = (async () => {
      const res = await generateStoryMutation.mutateAsync(personId as string);
      await handlePoll(res.task_id);
      return res;
    })();

    await sileo.promise(chroniclePromise, {
      loading: { title: 'Story Weaver Working...', description: 'The chronicle is being woven from linked memories.' },
      success: { title: 'Story Woven', description: 'The chronicle is ready for presentation.' },
      error: { title: 'Story Weaver Failed', description: 'The biography weave failed. Please try again in a moment.' }
    }).finally(() => setIsGenerating(false));
  };

  const saveBio = async () => {
    if (isForeignProfile) {
      sileo.error({ title: 'Read-Only Profile', description: 'This profile belongs to a linked vault and cannot be edited here.' });
      return;
    }
    setIsSavingBio(true);
    await sileo.promise(
      axiosClient.patch(`/vaults/${vaultId}/lineage/person/${personId}/`, { biography: editedBio }),
      {
        loading: { title: 'Preserving Chronicle...' },
        success: () => {
          setIsEditingBio(false);
          queryClient.invalidateQueries({ queryKey: ['personProfile', personId] });
          return { title: 'Chronicle Saved' };
        },
        error: { title: 'Failed to save chronicle' }
      }
    ).finally(() => setIsSavingBio(false));
  };

  const linkMemoryMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      if (isForeignProfile) throw new Error('This profile is read-only.');
      await axiosClient.post(`/vaults/${vaultId}/lineage/person/${personId}/link-memory/`, { memory_id: memoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personProfile', personId] });
      sileo.success({ title: 'Memory Tagged', description: 'Memory linked to this profile.' });
      setIsLinkModalOpen(false);
    }
  });

  const unlinkMemoryMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      if (isForeignProfile) throw new Error('This profile is read-only.');
      await axiosClient.delete(`/vaults/${vaultId}/lineage/person/${personId}/link-memory/`, { data: { memory_id: memoryId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personProfile', personId] });
      sileo.success({ title: 'Tag Removed', description: 'Memory unlinked from this profile.' });
    }
  });

  const handleNativeShare = async () => {
    const shareUrl = buildPersonShareUrl(profile?.vaultId || vaultId, String(personId)) || window.location.href;
    const shareData = {
      title: `${profile?.name} - Biography`,
      text: profile?.biography || `Explore the lineage chronicle of ${profile?.name}.`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        sileo.success({ title: 'Profile Shared' });
      } catch (err) {
        if (err instanceof DOMException && err.name !== 'AbortError') {
          sileo.error({ title: 'Sharing Failed' });
        }
      }
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    sileo.success({ title: 'Link Copied', description: 'Share URL copied to clipboard.' });
  };

  const handleTriggerPrint = () => window.print();

  const getNarrationVoice = () => {
    if (!('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.name.toLowerCase().includes('microsoft') && voice.lang.toLowerCase().startsWith('en')) ||
      voices.find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('en')) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
      voices[0] ||
      null
    );
  };

  const splitBiographyForSpeech = (text: string) => {
    const sentences = text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      if ((current + ' ' + trimmed).trim().length > 900) {
        if (current) chunks.push(current);
        current = trimmed;
      } else {
        current = (current + ' ' + trimmed).trim();
      }
    }

    if (current) chunks.push(current);
    return chunks;
  };

  const stopBiographyNarration = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    speechChunksRef.current = [];
    speechIndexRef.current = 0;
    setIsSpeakingBio(false);
  };

  const playNextSpeechChunk = () => {
    if (!('speechSynthesis' in window)) return;

    const chunk = speechChunksRef.current[speechIndexRef.current];
    if (!chunk) {
      setIsSpeakingBio(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = getNarrationVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      speechIndexRef.current += 1;
      window.setTimeout(playNextSpeechChunk, 80);
    };
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        sileo.error({ title: 'Narration Failed', description: 'The browser could not finish reading the biography.' });
      }
      setIsSpeakingBio(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleBiographyNarration = () => {
    if (!('speechSynthesis' in window)) {
      sileo.error({ title: 'Narration Unavailable', description: 'This browser does not expose local text-to-speech voices.' });
      return;
    }

    if (isSpeakingBio) {
      stopBiographyNarration();
      return;
    }

    const chunks = splitBiographyForSpeech(story);
    if (chunks.length === 0) return;

    window.speechSynthesis.cancel();
    speechChunksRef.current = chunks;
    speechIndexRef.current = 0;
    setIsSpeakingBio(true);
    playNextSpeechChunk();
  };

  const handleMemoryUpdate = (updatedMemory: any) => {
    setSelectedMemory(updatedMemory);
    queryClient.setQueryData<PersonProfileType>(['personProfile', personId], (current) => {
      if (!current) return current;
      return {
        ...current,
        memories: current.memories.map((memory) =>
          memory.id === updatedMemory.id ? { ...memory, ...updatedMemory } : memory
        ),
      };
    });
  };

  if (!profile) return null;

  const story = profile.biography || '';
  const allMemories = profile.memories || [];
  const kinship = [...new Map((profile.kinship || []).map((kin: any) => [kin.id, kin])).values()];
  const profileAvatar = profile.photo || `https://ui-avatars.com/api/?name=${profile.name.replace(' ', '+')}&background=B88F5B&color=fff&size=256`;
  const isChronicleBusy = isGenerating || generateStoryMutation.isPending || Boolean(profile.active_story_task_id);
  const loadingChronicleLabel = `${CHRONICLE_LOADING_LINES[chronicleLineIndex]}${'.'.repeat(chronicleDots)}`;

  const existingLinkedIds = new Set(allMemories.map(m => m.id));
  const linkCandidates = allVaultMemories.filter((m: any) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (m.title || '').toLowerCase().includes(query);
    const captionMatch = (m.ai_caption || '').toLowerCase().includes(query);
    return !existingLinkedIds.has(m.id) && (titleMatch || captionMatch);
  });

  const chronologicalMilestones = [...allMemories]
    .filter(m => m.year)
    .sort((a, b) => parseInt(a.year || '0', 10) - parseInt(b.year || '0', 10));

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] flex flex-col zone-light overflow-x-hidden -mt-[var(--shell-offset-top)]">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-biography, #print-biography * {
            visibility: visible;
          }
          #print-biography {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: var(--clr-ink) !important;
            background: var(--clr-linen) !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <MemoryDetailModal
        isOpen={Boolean(selectedMemory)}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
        onUpdate={handleMemoryUpdate}
      />

      <section className="bg-[var(--clr-charcoal)] relative overflow-hidden pt-[calc(var(--shell-offset-top)+64px)] pb-28 px-[clamp(20px,5vw,80px)]">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.img
            initial={{ scale: 1 }}
            animate={{ scale: 1.08 }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            src={allMemories[0]?.url || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200'}
            className="w-full h-full object-cover opacity-[0.08] sepia-[0.6] origin-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--clr-charcoal)] via-[rgba(20,18,17,0.35)] to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-8 max-w-[var(--max-width)] mx-auto">
          <div className="self-center lg:self-auto">
            <img src={profileAvatar} className="w-[150px] h-[150px] sm:w-[190px] sm:h-[190px] rounded-full border-[3px] border-[var(--clr-gold)] shadow-[var(--shadow-gold)] object-cover" alt={profile.name} />
          </div>
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(184,143,91,0.15)] border border-[var(--clr-gold)] rounded-full text-[var(--clr-gold)] font-ui text-[9px] uppercase font-bold tracking-[0.2em] mb-4 max-w-full">
              <span className="truncate">{profile.role || 'Relative'}</span>
            </div>
            <h1 className="font-display font-extrabold text-[clamp(2.2rem,4.8vw,4.4rem)] text-[var(--clr-linen)] leading-[1.03] tracking-wide break-words">
              {profile.name.toUpperCase()}
            </h1>
            <p className="font-ui text-[13px] text-[var(--clr-fog)] mt-4 leading-relaxed">
              {profile.birthYear && `Born ${profile.birthYear}`}{profile.birthYear && profile.deathYear && ' · '}{profile.deathYear && `Passed ${profile.deathYear}`}
            </p>
          </div>
          <div className="self-center lg:self-auto bg-[rgba(247,244,239,0.08)] border border-[rgba(184,143,91,0.3)] px-6 py-4 rounded-[var(--radius-lg)] text-center">
            <span className="block font-display text-[1.8rem] text-[var(--clr-linen)] leading-none mb-1">{profile.memoryCount}</span>
            <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--clr-gold)] font-bold">Memories</span>
          </div>
        </div>
      </section>

      <TornEdge direction="dark-to-light" />

      <section className="px-[clamp(20px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full pt-8 flex-1 flex flex-col pb-20">
        <div className="flex border-b border-[var(--clr-aged)] mb-8 relative overflow-x-auto no-scrollbar no-print">
          {[
            { id: 'CHRONICLE', label: 'Generative Chronicle' },
            { id: 'CONNECTIONS', label: 'Kinship Constellation' },
            { id: 'MEMORIES', label: 'Tagged Exhibits' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`font-ui text-[11px] uppercase font-bold tracking-[0.15em] px-5 sm:px-8 py-4 transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-[var(--clr-gold-dark)]' : 'text-[var(--clr-dust)] hover:text-[var(--clr-ink)]'}`}
            >
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="profileTab" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[var(--clr-gold)] z-10" />}
            </button>
          ))}
        </div>

        {activeTab === 'CHRONICLE' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 py-4 items-start w-full">
            <div id="print-biography" className="xl:col-span-2 w-full">
              {!story && !isGenerating ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] shadow-inner no-print">
                  <Quotes size={56} className="mx-auto text-[var(--clr-gold)] mb-5 opacity-60" weight="thin" />
                  <h3 className="font-display font-bold text-[26px] text-[var(--clr-ink)] mb-2 uppercase tracking-widest">No Chronicle Yet</h3>
                  <p className="font-ui text-[13px] mb-8 text-[var(--clr-dust)] max-w-[440px] mx-auto leading-relaxed px-4">
                    Weave {allMemories.length} tagged memories and metadata into a complete life record.
                  </p>
                  <Button variant="primary" onClick={generateChronicle} disabled={isChronicleBusy} className="px-8 py-4 shadow-[var(--shadow-gold)]">
                    <Sparkle size={18} weight="fill" /> {isChronicleBusy ? loadingChronicleLabel : 'Write Biography'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] p-[clamp(20px,4vw,56px)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] relative overflow-hidden">
                  <div className="text-center mb-10">
                    <p className="font-script text-[42px] text-[var(--clr-gold-dark)] leading-[0.65]">"Biographical Record of"</p>
                    <h2 className="font-display font-extrabold text-[clamp(1.8rem,4vw,2.5rem)] tracking-[0.08em] text-[var(--clr-ink)] mt-5 leading-tight break-words">{profile.name.toUpperCase()}</h2>
                    <p className="font-ui text-[10px] uppercase font-bold tracking-[0.22em] text-[var(--clr-dust)] mt-4">{profile.birthYear || '?'}{profile.deathYear ? ` — ${profile.deathYear}` : ''}</p>
                    <div className="w-16 h-[2px] bg-[var(--clr-gold)] mx-auto mt-7 opacity-60 no-print" />
                  </div>

                  <div className="font-ui text-[15px] text-[var(--clr-ink)] leading-[1.9] text-justify">
                    {isEditingBio ? (
                      <textarea
                        value={editedBio}
                        onChange={e => setEditedBio(e.target.value)}
                        className="w-full min-h-[280px] p-5 bg-transparent font-ui leading-relaxed border border-[var(--clr-aged)] rounded-[var(--radius-md)] focus:border-[var(--clr-gold)] outline-none"
                      />
                    ) : (
                      <>
                        <span className="float-left text-[4.1rem] font-display font-bold text-[var(--clr-gold-dark)] leading-[0.8] pr-3 pt-2">
                          {story.charAt(0)}
                        </span>
                        <span className="whitespace-pre-wrap">{story.slice(1)}</span>
                      </>
                    )}
                    {isGenerating && (
                      <span className="inline-flex items-center gap-2 ml-2 align-middle">
                        <span className="inline-block w-2.5 h-5 bg-[var(--clr-gold)] animate-pulse" />
                        <span className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold-dark)]">
                          {loadingChronicleLabel}
                        </span>
                      </span>
                    )}
                  </div>

                  {isComplete && (
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-12 pt-6 border-t border-[rgba(184,143,91,0.3)] no-print flex flex-col sm:flex-row justify-between items-center gap-5">
                      <div className="flex items-center gap-2">
                        <MagicWand size={17} className="text-[var(--clr-gold)]" weight="fill" />
                        <p className="font-ui text-[9px] uppercase font-bold tracking-widest text-[var(--clr-dust)]">AI Generated</p>
                      </div>
                      <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <Button variant="ghost" className="px-5 py-2.5 text-[10px]" disabled={isSavingBio || isForeignProfile} onClick={() => isEditingBio ? saveBio() : (setEditedBio(story), setIsEditingBio(true))}>
                          {isSavingBio ? 'Saving...' : (isEditingBio ? 'Save Biography' : 'Edit')}
                        </Button>
                        <Tooltip content="Regenerate Biography">
                        <Button variant="icon" disabled={isChronicleBusy || isForeignProfile} onClick={generateChronicle}>
                            <MagicWand size={16} className={isChronicleBusy ? 'animate-pulse' : ''} weight="fill" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={isSpeakingBio ? 'Stop Narration' : 'Read Biography Aloud'}>
                          <Button variant="icon" disabled={!story || isEditingBio} onClick={toggleBiographyNarration}>
                            {isSpeakingBio ? <SpeakerX size={16} weight="fill" /> : <SpeakerHigh size={16} weight="fill" />}
                          </Button>
                        </Tooltip>
                        <Tooltip content="Share Life Page">
                          <Button variant="icon" onClick={handleNativeShare}><ShareNetwork size={16} /></Button>
                        </Tooltip>
                        <Tooltip content="Print Life Page">
                          <Button variant="icon" onClick={handleTriggerPrint}><Printer size={16} /></Button>
                        </Tooltip>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="w-full space-y-5 no-print">
              <h3 className="font-display font-bold text-[1.2rem] text-[var(--clr-ink)] tracking-wider uppercase mb-4 flex items-center gap-2">
                <BookOpen size={19} className="text-[var(--clr-gold)]" /> Life Milestones
              </h3>

              <div className="relative border-l-2 border-[var(--clr-aged)] pl-5 ml-2 space-y-6">
                {profile.birthYear && (
                  <div className="relative">
                    <span className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--clr-gold-dark)] border-2 border-[var(--clr-parchment)]" />
                    <p className="font-display font-bold text-[14px] text-[var(--clr-gold-dark)]">{profile.birthYear}</p>
                    <p className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)] mt-0.5">Birth Recorded</p>
                  </div>
                )}

                {chronologicalMilestones.map((milestone) => (
                  <div key={milestone.id} className="relative group cursor-pointer" onClick={() => setSelectedMemory(milestone)}>
                    <span className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--clr-paper)] border-2 border-[var(--clr-parchment)] group-hover:bg-[var(--clr-gold)] transition-colors" />
                    <p className="font-display font-bold text-[14px] text-[var(--clr-ink)] group-hover:text-[var(--clr-gold-dark)] transition-colors">{milestone.year}</p>
                    <h4 className="font-ui text-[12px] font-bold text-[var(--clr-ink)] mt-0.5 leading-tight break-words">{milestone.title || 'Untitled Exhibit'}</h4>
                    <p className="font-ui text-[10px] text-[var(--clr-dust)] mt-1 flex items-center gap-1 break-words"><MapPin size={10} /> {milestone.location || 'Location Unknown'}</p>
                  </div>
                ))}

                {profile.deathYear && (
                  <div className="relative">
                    <span className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--clr-danger)] border-2 border-[var(--clr-parchment)]" />
                    <p className="font-display font-bold text-[14px] text-[var(--clr-danger)]">{profile.deathYear}</p>
                    <p className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)] mt-0.5">Passed Away</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CONNECTIONS' && (
          <div className="flex-1 min-h-[560px] rounded-[var(--radius-lg)] border border-[var(--clr-aged)] bg-[var(--clr-paper)] shadow-inner overflow-hidden flex items-center justify-center no-print px-4 py-8">
            <div className="relative w-full max-w-[620px] aspect-square">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className="w-[92px] h-[92px] sm:w-[106px] sm:h-[106px] rounded-full border-[3px] border-[var(--clr-gold)] shadow-[var(--shadow-gold)] bg-[var(--clr-linen)] overflow-hidden">
                  <img src={profileAvatar} className="w-full h-full object-cover" alt={profile.name} />
                </div>
                <div className="bg-[var(--clr-charcoal)] text-[var(--clr-linen)] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mt-3 shadow-md border border-[var(--clr-gold)] max-w-[220px] truncate">
                  {profile.name}
                </div>
              </motion.div>

              {kinship.map((kin: any, i: number) => {
                const angle = (i / Math.max(kinship.length, 1)) * Math.PI * 2;
                const radius = kinship.length > 10 ? 200 : 160;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const isSpouse = kin.relationship === 'SPOUSE_OF';
                const avatar = kin.avatar || `https://ui-avatars.com/api/?name=${kin.name.replace(' ', '+')}&background=B88F5B&color=fff&size=128`;

                return (
                  <div key={kin.id} className="absolute inset-0">
                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                      <motion.line
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, delay: i * 0.03 }}
                        x1="50%" y1="50%" x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                        stroke={isSpouse ? 'var(--clr-gold-light)' : 'var(--clr-gold)'}
                        strokeWidth={isSpouse ? '2.5' : '1.5'}
                        strokeDasharray={isSpouse ? 'none' : '4 4'}
                        opacity="0.7"
                      />
                    </svg>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1, x, y }}
                      transition={{ type: 'spring', damping: 20, stiffness: 110, delay: i * 0.03 + 0.15 }}
                      className="absolute top-1/2 left-1/2 -ml-10 -mt-10 flex flex-col items-center cursor-pointer group"
                      onClick={() => navigate({ to: `/person/${kin.id}` })}
                    >
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--clr-aged)] group-hover:border-[var(--clr-gold)] transition-all bg-[var(--clr-linen)] overflow-hidden">
                        <img src={avatar} className="w-full h-full object-cover" alt={kin.name} />
                      </div>
                      <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] px-3 py-1 rounded-[var(--radius-sm)] mt-2 shadow-sm text-center group-hover:border-[var(--clr-gold)] transition-all flex flex-col items-center max-w-[140px]">
                        <p className="font-display font-bold text-[11px] text-[var(--clr-ink)] leading-none truncate w-full flex items-center justify-center gap-1">
                          <span className="truncate">{kin.name}</span>
                          {isSpouse && <Heart size={10} weight="fill" className="text-[var(--clr-danger)] shrink-0" />}
                        </p>
                        <p className="font-ui text-[8px] uppercase tracking-widest text-[var(--clr-dust)] mt-1 font-black truncate w-full">{kin.relationship || kin.role || 'Relative'}</p>
                      </div>
                    </motion.button>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-6 left-6 text-[var(--clr-dust)] items-center gap-2 hidden md:flex">
              <TreeStructure size={22} weight="thin" />
              <span className="font-ui text-[10px] uppercase font-bold tracking-widest">Interactive Lineage Map</span>
            </div>
          </div>
        )}

        {activeTab === 'MEMORIES' && (
          <div className="space-y-6 no-print">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h3 className="font-display font-bold text-[1.15rem] text-[var(--clr-ink)] uppercase tracking-wider">Tagged Exhibits</h3>
              {canEditProfile && (
                <Button variant="primary" className="py-2.5 px-5 text-[10px]" onClick={() => setIsLinkModalOpen(true)}>
                  <Plus size={14} weight="bold" /> Tag Existing Memory
                </Button>
              )}
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-[var(--space-6)] space-y-[var(--space-6)]">
              {allMemories.map((mem: any) => (
                <div key={mem.id} className="break-inside-avoid relative group">
                  <div className="cursor-pointer" onClick={() => setSelectedMemory(mem)}>
                    <MemoryCard memory={{ ...mem, tags: mem.tags?.slice(0, 2) || [] }} />
                  </div>
                  {canEditProfile && (
                    <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip content="Remove Tag">
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkMemoryMutation.mutate(mem.id); }}
                          className="w-8 h-8 rounded-full bg-[rgba(247,244,239,0.92)] shadow text-[var(--clr-danger)] border border-[rgba(139,58,58,0.24)] flex items-center justify-center hover:bg-[var(--clr-danger)] hover:text-[var(--clr-linen)] transition-all cursor-pointer"
                        >
                          <Trash size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {isLinkModalOpen && canEditProfile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLinkModalOpen(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-3xl h-[min(86svh,760px)] bg-[var(--clr-parchment)] border border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-5 sm:p-7 shadow-2xl flex flex-col">
              <div className="flex justify-between items-start gap-4 mb-5">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-[1.4rem] uppercase tracking-widest text-[var(--clr-ink)] break-words">Tag Existing Memory</h3>
                  <p className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-dust)] mt-1">Bind vault memories to {profile.name}&apos;s profile</p>
                </div>
                <Tooltip content="Close">
                  <button onClick={() => setIsLinkModalOpen(false)} className="w-10 h-10 rounded-full border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-[var(--clr-linen)] transition-all shrink-0">
                    <X size={18} />
                  </button>
                </Tooltip>
              </div>

              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-5 py-3 font-ui text-[14px] outline-none focus:border-[var(--clr-gold)] mb-5 shadow-inner"
              />

              <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                {linkCandidates.map((m: any) => (
                  <div key={m.id} className="bg-[var(--clr-linen)] rounded-[var(--radius-md)] border border-[var(--clr-aged)] overflow-hidden flex flex-col relative">
                    <div className="aspect-[4/3] bg-[var(--clr-paper)] overflow-hidden">
                      <img src={m.url || m.original_file} className="w-full h-full object-cover" alt={m.title || 'Memory'} />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between gap-3 min-h-[108px]">
                      <div className="min-w-0">
                        <h4 className="font-ui font-bold text-[12px] text-[var(--clr-ink)] truncate">{m.title || 'Untitled Artifact'}</h4>
                        <p className="font-ui text-[9px] text-[var(--clr-dust)] mt-0.5">{m.year || 'Undated'}</p>
                      </div>
                      <button
                        onClick={() => linkMemoryMutation.mutate(m.id)}
                        className="w-full py-1.5 bg-[var(--clr-gold)] text-[var(--clr-charcoal)] font-ui font-bold text-[9px] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-[var(--clr-gold-light)] transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus size={10} weight="bold" /> Tag Relative
                      </button>
                    </div>
                  </div>
                ))}
                {linkCandidates.length === 0 && (
                  <div className="col-span-full text-center py-10 text-[var(--clr-dust)] font-ui text-sm italic">
                    No matching untagged memories found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

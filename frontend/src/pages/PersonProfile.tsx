import { useState } from 'react';
import { motion } from 'framer-motion';
import { MagicWand, DownloadSimple, ShareNetwork, Sparkle, TreeStructure, Quotes } from '@phosphor-icons/react';
import { TornEdge } from '../components/ui/TornEdge';
import { Button } from '../components/ui/Button';
import MemoryCard from '../components/vault/MemoryCard';
import { VAULT_MEMORY_CLUSTERS } from '../features/vault/vaultMockData';
import { useParams } from '@tanstack/react-router';
import { useGenerateStory } from '../features/chronicles/hooks/useChronicles';
import { pollTask } from '../lib/tasks';
import { useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';

const MOCK_STORY_CHUNKS = [
  "Born in the walled city of Harar in 1942, Abebe's early life was framed by the vibrant markets and the scent of roasted coffee. ",
  "He moved to Addis Ababa in the late 1960s, seeking education and opportunity, carrying nothing but a leather suitcase and his father's old watch. ",
  "The memories preserved in this vault reveal a man who cherished family above all. In the summer of 1994, during his 50th birthday at Entoto Park, his smile outshone the sun—a moment captured perfectly by his son, Yohannes. ",
  "Abebe was not just a patriarch; he was the archivist of his generation's history, leaving behind a legacy of resilience, laughter, and an unbreakable bond with his roots."
];

const KINSHIP = [
  { id: 2, name: 'Fatima', role: 'Wife', avatar: 'https://ui-avatars.com/api/?name=Fatima&background=DBCFB5&color=2A2522' },
  { id: 3, name: 'Yohannes', role: 'Son', avatar: 'https://ui-avatars.com/api/?name=Yohannes&background=3A5F7A&color=fff' },
  { id: 4, name: 'Sara', role: 'Daughter', avatar: 'https://ui-avatars.com/api/?name=Sara&background=4A7C59&color=fff' },
  { id: 5, name: 'Dawit', role: 'Grandson', avatar: 'https://ui-avatars.com/api/?name=Dawit&background=A0622A&color=fff' },
  { id: 6, name: 'Lia', role: 'Granddaughter', avatar: 'https://ui-avatars.com/api/?name=Lia&background=8B3A3A&color=fff' },
];

export default function PersonProfile() {
  const [activeTab, setActiveTab] = useState<'CHRONICLE' | 'CONNECTIONS' | 'MEMORIES'>('CHRONICLE');

  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Flatten mock memories for the exhibition hall
  const allMemories = VAULT_MEMORY_CLUSTERS.flatMap(c => c.memories).slice(0, 9);

  const generateChronicle = async () => {
    const { personId } = useParams({ from: '/person/$personId' });
    const generateStoryMutation = useGenerateStory();
    const queryClient = useQueryClient();

    try {
      setIsGenerating(true);
      setStory('');
      setIsComplete(false);

      const { task_id } = await generateStoryMutation.mutateAsync(personId);

      await sileo.promise(pollTask(task_id), {
        loading: { title: "Story Weaver is thinking...", description: "Consulting artifacts and memories..." },
        success: (result) => {
          queryClient.invalidateQueries({ queryKey: ['personProfile', personId] });
          animateTypewriter(result?.biography || "No story could be woven.");
          return { title: "Chronicle Woven", description: "The biography has been added to the archives." };
        },
        error: { title: "Story Weaver Failed", description: "Ensure Ollama is running and Llama3 is pulled." }
      });

    } catch (error) {
      setIsGenerating(false);
    }
  };

  const animateTypewriter = (text: string) => {
    let i = 0;
    const interval = setInterval(() => {
      setStory((prev) => text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsGenerating(false);
        setIsComplete(true);
      }
    }, 15);
  };

  return (
    // Pull the wrapper up underneath the navbar with a negative margin 
    <div className="min-h-screen bg-[var(--clr-parchment)] flex flex-col zone-light overflow-x-hidden -mt-[var(--shell-offset-top)]">
      
      {/* Anchor the top padding to compensate for the overlap, cleanly clearing the logo */}
      <section className="bg-[var(--clr-charcoal)] relative overflow-hidden pt-[calc(var(--shell-offset-top)+64px)] pb-32 px-[clamp(24px,5vw,80px)]">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.img
            initial={{ scale: 1 }} animate={{ scale: 1.1 }} transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200"
            className="w-full h-full object-cover opacity-[0.08] sepia-[0.6] origin-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--clr-charcoal)] via-[rgba(20,18,17,0.4)] to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-10 max-w-[var(--max-width)] mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="relative group cursor-pointer">
            <div className="absolute inset-0 rounded-full bg-[var(--clr-gold)] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
            <img
              src="https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff&size=256"
              className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full border-[3px] border-[var(--clr-gold)] shadow-[var(--shadow-gold)] object-cover relative z-10"
              alt="Abebe Kebede"
            />
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(184,143,91,0.15)] border border-[var(--clr-gold)] rounded-full text-[var(--clr-gold)] font-ui text-[9px] uppercase font-bold tracking-[0.2em] mb-4">
              Family Patriarch
            </div>
            <h1 className="font-display font-extrabold text-[clamp(2.5rem,5vw,4.5rem)] text-[var(--clr-linen)] leading-[1.0] tracking-wide">
              ABEBE KEBEDE
            </h1>
            <p className="font-script text-[48px] md:text-[56px] text-[var(--clr-gold-light)] leading-[0.6] mt-4 mb-6">
              "A man of extraordinary memory"
            </p>
            <p className="font-ui text-[14px] text-[var(--clr-fog)] mb-0 md:max-w-[80%] leading-relaxed font-medium">
              Born March 12, 1942 &middot; Harar, Ethiopia<br/>
              Passed October 3, 2019 &middot; Addis Ababa, Ethiopia &middot; Age 77
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="hidden lg:flex flex-col gap-4 shrink-0">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(184,143,91,0.3)] px-8 py-5 rounded-[var(--radius-lg)] text-center backdrop-blur-sm">
              <span className="block font-display text-[2rem] text-[var(--clr-linen)] leading-none mb-1">{allMemories.length}</span>
              <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--clr-gold)] font-bold">Memories</span>
            </div>
          </motion.div>
        </div>
      </section>

      <TornEdge direction="dark-to-light" />

      <section className="px-[clamp(24px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full pt-8 flex-1 flex flex-col pb-24">
        <div className="flex border-b border-[var(--clr-aged)] mb-12 relative overflow-x-auto no-scrollbar">
          {[
            { id: 'CHRONICLE', label: 'Generative Chronicle' },
            { id: 'CONNECTIONS', label: 'Kinship Constellation' },
            { id: 'MEMORIES', label: 'Tagged Exhibits' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`font-ui text-[12px] uppercase font-bold tracking-[0.15em] px-8 py-5 transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-[var(--clr-gold-dark)]' : 'text-[var(--clr-dust)] hover:text-[var(--clr-ink)]'}`}
            >
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="profileTab" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[var(--clr-gold)] z-10" />}
            </button>
          ))}
        </div>

        {activeTab === 'CHRONICLE' && (
          <div className="max-w-[760px] mx-auto py-8 w-full">
            {!story && !isGenerating ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] shadow-inner">
                <Quotes size={64} className="mx-auto text-[var(--clr-gold)] mb-6 opacity-60" weight="thin" />
                <h3 className="font-display font-bold text-[28px] text-[var(--clr-ink)] mb-2 uppercase tracking-widest">No Chronicle Yet</h3>
                <p className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5] mb-8">"Their story awaits"</p>
                <p className="font-ui text-[14px] mb-8 text-[var(--clr-dust)] max-w-[400px] mx-auto leading-relaxed">
                  Have our Story Weaver AI analyze {allMemories.length} tagged memories, EXIF data, and relationships to pen a beautifully narrated biography.
                </p>
                <Button variant="primary" onClick={generateChronicle} className="px-10 py-4 shadow-[var(--shadow-gold)]">
                  <Sparkle size={18} weight="fill" /> WRITE BIOGRAPHY
                </Button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] p-[clamp(32px,6vw,80px)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] relative overflow-hidden">
                <div className="absolute top-10 right-10 opacity-[0.03] pointer-events-none">
                   <svg width="300" height="300" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#2A2522" strokeWidth="1"/></svg>
                </div>

                <div className="text-center mb-16 relative z-10">
                  <p className="font-script text-[56px] text-[var(--clr-gold-dark)] leading-[0.5]">"The Life of"</p>
                  <h2 className="font-display font-extrabold text-[2.75rem] tracking-[0.1em] text-[var(--clr-ink)] mt-6 leading-none">ABEBE KEBEDE</h2>
                  <p className="font-ui text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--clr-dust)] mt-4">1942 — 2019</p>
                  <div className="w-16 h-[2px] bg-[var(--clr-gold)] mx-auto mt-8 opacity-60" />
                </div>

                <div className="font-ui text-[16px] text-[var(--clr-ink)] leading-[2.0] relative z-10 text-justify">
                  <span className="float-left text-[5rem] font-display font-bold text-[var(--clr-gold-dark)] leading-[0.8] pr-3 pt-3 drop-shadow-sm">
                    {story.charAt(0)}
                  </span>
                  <span className="whitespace-pre-wrap">{story.slice(1)}</span>
                  {isGenerating && <span className="inline-block w-2.5 h-5 bg-[var(--clr-gold)] animate-pulse ml-1 align-middle" />}
                </div>

                {isComplete && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-20 pt-8 border-t border-[rgba(184,143,91,0.3)]">

                    <div className="mb-16 p-3 bg-white border border-[var(--clr-aged)] shadow-md rotate-[-2deg] max-w-[400px] mx-auto hover:rotate-0 transition-transform duration-500 cursor-pointer">
                      <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600" className="w-full h-auto sepia-[0.3]" alt="Memory insert" />
                      <p className="font-script text-[32px] text-center text-[var(--clr-dust)] mt-4 leading-none">"Summer of '94"</p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-3">
                        <MagicWand size={20} className="text-[var(--clr-gold)]" weight="fill"/>
                        <p className="font-ui text-[10px] uppercase font-bold tracking-widest text-[var(--clr-fog)]">
                          AI-Generated from {allMemories.length} Artifacts
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="ghost" className="px-6 py-2.5 text-[10px]"><ShareNetwork size={16} /> Share</Button>
                        <Button variant="ghost" className="px-6 py-2.5 text-[10px]"><DownloadSimple size={16} /> PDF</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'CONNECTIONS' && (
          <div className="flex-1 min-h-[600px] relative rounded-[var(--radius-lg)] border border-[var(--clr-aged)] bg-[var(--clr-paper)] shadow-inner overflow-hidden flex items-center justify-center">

            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--clr-ink)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <div className="relative w-[400px] h-[400px] flex items-center justify-center">

              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                className="absolute z-20 flex flex-col items-center"
              >
                <div className="w-[100px] h-[100px] rounded-full border-[3px] border-[var(--clr-gold)] shadow-[var(--shadow-gold)] bg-white overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff&size=128" className="w-full h-full object-cover" alt="" />
                </div>
                <div className="bg-[var(--clr-charcoal)] text-[var(--clr-linen)] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mt-3 shadow-md">
                  Abebe
                </div>
              </motion.div>

              {KINSHIP.map((kin, i) => {
                const angle = (i / KINSHIP.length) * Math.PI * 2;
                const radius = 160;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <div key={kin.id} className="absolute inset-0 pointer-events-none">
                    <svg className="absolute inset-0 w-full h-full overflow-visible z-0">
                      <motion.line
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.1 }}
                        x1="50%" y1="50%" x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                        stroke="var(--clr-gold)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6"
                      />
                    </svg>

                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1, x, y }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100, delay: i * 0.1 + 0.5 }}
                      className="absolute top-1/2 left-1/2 -ml-8 -mt-8 flex flex-col items-center cursor-pointer pointer-events-auto group"
                    >
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--clr-aged)] group-hover:border-[var(--clr-gold)] group-hover:shadow-[var(--shadow-md)] transition-all bg-[var(--clr-linen)] overflow-hidden">
                        <img src={kin.avatar} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] px-3 py-1 rounded-[var(--radius-sm)] mt-2 shadow-sm text-center group-hover:border-[var(--clr-gold)] transition-colors">
                        <p className="font-display font-bold text-[13px] text-[var(--clr-ink)] leading-none">{kin.name}</p>
                        <p className="font-ui text-[8px] uppercase tracking-widest text-[var(--clr-dust)] mt-1">{kin.role}</p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-6 left-6 text-[var(--clr-dust)] flex items-center gap-2">
              <TreeStructure size={24} weight="thin"/>
              <span className="font-ui text-[10px] uppercase font-bold tracking-widest">Kinship Constellation</span>
            </div>
          </div>
        )}

        {activeTab === 'MEMORIES' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="columns-1 md:columns-2 lg:columns-3 gap-[var(--space-6)] space-y-[var(--space-6)] py-4"
          >
            {allMemories.map((mem) => (
               <div key={mem.id} className="break-inside-avoid shadow-sm hover:shadow-md transition-shadow rounded-lg">
                 <MemoryCard memory={{ ...mem, tags: mem.tags.slice(0,2) }} />
               </div>
            ))}
          </motion.div>
        )}

      </section>
    </div>
  );
}
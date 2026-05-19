import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Sparkle, X, ArrowRight, Binoculars } from '@phosphor-icons/react';
import MemoryCard from '../components/vault/MemoryCard';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useVibeSearch } from '../features/search/hooks/useSearch';
import { useVaultMemories } from '../features/vault/hooks/useVault';
import { sileo } from 'sileo';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../services/axiosClient';
import { extractList } from '../services/responseExtractor';

const AI_THINKING_STEPS = [
  "Scanning visual vectors...",
  "Analyzing facial expressions...",
  "Consulting the archives...",
  "Curating your memories..."
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchMutation = useVibeSearch();
  const activeVaultId = useAuthStore((s) => s.activeVaultId);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['searchSuggestions', activeVaultId],
    queryFn: () => axiosClient.get(`/vaults/${activeVaultId}/search/tags/`).then(extractList<string>),
    enabled: !!activeVaultId,
  });

  const { data: allMemories = [] } = useVaultMemories();

  const handleSearch = async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = forceQuery || query;

    if (!activeQuery.trim()) return;

    if (forceQuery) setQuery(forceQuery);
    setHasSearched(false);
    setResults([]);
    setThinkingStep(0);
    inputRef.current?.blur();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < AI_THINKING_STEPS.length) setThinkingStep(step);
    }, 600);

    try {
      const data = await searchMutation.mutateAsync(activeQuery);
      setResults(data);
      setHasSearched(true);
    } catch (error) {
      sileo.error({ title: "Search Failed", description: "The AI curator encountered an error." });
    } finally {
      clearInterval(interval);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen zone-light pt-[120px] pb-24 px-[clamp(24px,5vw,80px)] flex flex-col relative overflow-hidden">
      <MemoryDetailModal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)} memory={selectedMemory} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--clr-gold)] rounded-full blur-[200px] opacity-[0.03] pointer-events-none" />

      <div className={`max-w-[800px] mx-auto w-full transition-all duration-700 ease-[var(--ease-out)] ${hasSearched ? 'mb-12 scale-95' : 'mb-24 mt-[10vh] scale-100'}`}>
        <motion.div layout className="text-center mb-12">
          <h1 className="font-display font-semibold text-[clamp(2rem,4vw,3rem)] text-[var(--clr-ink)] tracking-[0.03em] uppercase drop-shadow-sm">The Curator's Desk</h1>
          <AnimatePresence mode="wait">
            {!hasSearched && !searchMutation.isPending && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5] mt-4 overflow-hidden">
                "Describe a moment..."
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.form layout onSubmit={handleSearch} className={`relative z-20 transition-all duration-500 rounded-full ${isFocused || searchMutation.isPending ? 'shadow-[var(--shadow-gold)] scale-[1.02]' : 'shadow-[var(--shadow-lg)] scale-100'}`}>
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]">
            {searchMutation.isPending ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkle size={28} weight="fill" /></motion.div>
            ) : (
              <Sparkle size={28} weight={isFocused ? "fill" : "regular"} className="transition-all duration-300" />
            )}
          </div>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} disabled={searchMutation.isPending} placeholder="Try: 'Dad laughing in the rain during the 80s...'" className="w-full bg-[var(--clr-linen)] border-2 border-[var(--clr-aged)] rounded-full pl-16 pr-20 py-6 text-[18px] text-[var(--clr-ink)] font-ui outline-none focus:border-[var(--clr-gold)] focus:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed" />

          <AnimatePresence>
            {query && !searchMutation.isPending && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} type="button" onClick={clearSearch} className="absolute right-20 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--clr-paper)] text-[var(--clr-dust)] hover:text-[var(--clr-danger)] hover:bg-[rgba(139,58,58,0.1)] flex items-center justify-center transition-colors"><X size={16} weight="bold" /></motion.button>
            )}
          </AnimatePresence>
          <button type="submit" disabled={!query.trim() || searchMutation.isPending} className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-[var(--clr-gold)] text-white rounded-full flex items-center justify-center shadow-[var(--shadow-md)] hover:bg-[var(--clr-gold-light)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"><MagnifyingGlass size={24} weight="bold" /></button>
        </motion.form>

        <AnimatePresence>
          {!hasSearched && !searchMutation.isPending && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mt-12 flex flex-wrap justify-center gap-3">
              <p className="w-full text-center font-ui text-[11px] uppercase tracking-widest text-[var(--clr-dust)] mb-2">Or explore these vibes</p>
              {suggestions.map((tag: string) => (
                <button key={tag} onClick={() => handleSearch(undefined, tag)} className="px-5 py-2.5 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] text-[var(--clr-ink)] font-ui text-[13px] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold-dark)] hover:shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5">"{tag}"</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {searchMutation.isPending && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 text-center">
              <p className="font-display text-[1.25rem] text-[var(--clr-gold-dark)] italic">{AI_THINKING_STEPS[thinkingStep] || "Curating memories..."}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {hasSearched && !searchMutation.isPending && (
          <motion.div key="results" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="max-w-[var(--max-width)] mx-auto w-full flex-1">
            {results.length > 0 ? (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-[var(--clr-aged)] gap-6">
                  <div>
                    <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-ink)]">{results.length} RESULTS FOUND</h2>
                    <p className="font-script text-[36px] text-[var(--clr-dust)] leading-[0.5] mt-2">"For: {query}"</p>
                  </div>
                  <div className="bg-[rgba(184,143,91,0.08)] border border-[rgba(184,143,91,0.3)] rounded-[var(--radius-lg)] p-4 max-w-[400px] flex gap-3 items-start">
                    <Sparkle size={20} weight="fill" className="text-[var(--clr-gold)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-ui text-[10px] uppercase font-bold tracking-widest text-[var(--clr-gold-dark)] mb-1">AI Insight</p>
                      <p className="font-ui text-[12px] text-[var(--clr-dust)] leading-relaxed">Matches generated using semantic visual analysis and emotional tone extraction.</p>
                    </div>
                  </div>
                </div>
                <div className="columns-1 md:columns-2 lg:columns-3 gap-[var(--space-6)] space-y-[var(--space-6)]">
                  {results.map((memory, i) => (
                    <motion.div key={memory.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="break-inside-avoid">
                      <div className="cursor-pointer" onClick={() => setSelectedMemory(memory)}>
                        <MemoryCard memory={{
                          ...memory,
                          url: memory.url || '/placeholder-museum.jpg',
                          tags: (memory.tags || []).slice(0, 3)
                        }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-24 max-w-[500px] mx-auto">
                <div className="w-20 h-20 bg-[var(--clr-paper)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--clr-aged)]">
                    {searchMutation.isPending ? <Sparkle size={32} className="animate-spin" /> : <Binoculars size={32} />}
                </div>
                <h3 className="font-display text-[2rem] text-[var(--clr-ink)] mb-2">
                    {allMemories.some((m: any) => !m.is_indexed) ? "AI STILL INDEXING" : "NOTHING FOUND"}
                </h3>
                <p className="font-ui text-[14px] text-[var(--clr-dust)] mb-8">
                    {allMemories.some((m: any) => !m.is_indexed)
                        ? "Some artifacts are still being visually indexed by the AI. Please wait a few moments for full vibe-search capability."
                        : `The curator couldn't find anything matching exactly "${query}".`}
                </p>
                <button onClick={clearSearch} className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-gold)] border border-[var(--clr-gold)] px-8 py-3 rounded-full hover:bg-[rgba(184,143,91,0.1)] transition-colors inline-flex items-center gap-2"><ArrowRight size={16} /> Search Again</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
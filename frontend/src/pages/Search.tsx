import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Sparkle, X, ArrowRight, Binoculars, Info } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import MemoryCard from '../components/vault/MemoryCard';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useDeepVibeSearch, useVibeSearch } from '../features/search/hooks/useSearch';
import { useVaultMemories } from '../features/vault/hooks/useVault';
import { sileo } from 'sileo';
import { useAuthStore } from '../stores/authStore';
import axiosClient from '../services/axiosClient';
import { appEnv } from '../services/env';
import { extractList } from '../services/responseExtractor';
import { cancelTask } from '../lib/tasks';
import { useSearchStore } from '../stores/searchStore';

const AI_THINKING_STEPS = [
  "Tuning the archive's pulse...",
  "Listening for names, dates, and traces...",
  "Letting tags and phrases echo forward...",
  "Pulling the clearest memories into focus...",
  "Settling the strongest matches at the top..."
];

const normalizeMediaUrl = (value?: string | null) => {
  if (!value) return value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  if (/^[a-z][a-z\d+\-.]*:/i.test(value)) return value;

  try {
    return new URL(value, appEnv.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

const normalizeMemory = (memory: any) => ({
  ...memory,
  url: normalizeMediaUrl(memory?.url) || '/placeholder-museum.jpg',
  restoredUrl: normalizeMediaUrl(memory?.restoredUrl) || memory?.restoredUrl,
});

export default function Search() {
  const searchSession = useSearchStore((s) => s.session);
  const setSearchSession = useSearchStore((s) => s.setSession);
  const patchSearchSession = useSearchStore((s) => s.patchSession);
  const resetSearchSession = useSearchStore((s) => s.resetSession);
  const [query, setQuery] = useState(() => searchSession.query);
  const [useDeepSearch, setUseDeepSearch] = useState(() => searchSession.deep);
  const [isFocused, setIsFocused] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const quickSearchMutation = useVibeSearch();
  const deepSearchMutation = useDeepVibeSearch();
  const activeVaultId = useAuthStore((s) => s.activeVaultId);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['searchSuggestions', activeVaultId],
    queryFn: () => axiosClient.get(`/vaults/${activeVaultId}/search/tags/`).then(extractList<string>),
    enabled: !!activeVaultId,
  });

  const { data: allMemories = [] } = useVaultMemories();

  const results = searchSession.results || [];
  const normalizedResults = results.map(normalizeMemory);
  const hasSearched = Boolean(searchSession.query.trim());
  const isProcessing = searchSession.status === 'PROCESSING';

  useEffect(() => {
    if (!isProcessing) {
      setThinkingStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setThinkingStep((current) => (current + 1) % AI_THINKING_STEPS.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const handleSearch = async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = (forceQuery || query).trim();

    if (!activeQuery) return;

    if (forceQuery) setQuery(forceQuery);
    setSelectedMemory(null);
    inputRef.current?.blur();

    if (useDeepSearch) {
      setSearchSession({
        query: activeQuery,
        deep: true,
        status: 'PROCESSING',
        taskId: null,
        progress: 5,
        stage: 'Preparing deep search...',
        error: null,
        results: [],
        updatedAt: new Date().toISOString(),
      });

      try {
        const startPromise = deepSearchMutation.mutateAsync(activeQuery);
        const response = await sileo.promise(startPromise, {
          loading: {
            title: 'Starting deep search...',
            description: 'The archive is preparing the deeper scan.',
          },
          success: () => ({
            title: 'Deep search running',
            description: 'Progress will continue in the background.',
          }),
          error: {
            title: 'Search Failed',
            description: 'The archive could not start the deep search job.',
          },
        });

        if (useSearchStore.getState().session.status === 'CANCELLED') {
          void cancelTask(response.task_id).catch(() => undefined);
          return;
        }

        patchSearchSession({
          deep: true,
          status: 'PROCESSING',
          taskId: response.task_id,
          progress: response.progress ?? 0,
          stage: response.stage || 'Queued for deep search',
          error: null,
          results: [],
        });
      } catch {
        patchSearchSession({
          deep: true,
          status: 'FAILED',
          error: 'The deep search job could not be started.',
          stage: 'Search failed',
        });
      }
      return;
    }

    setSearchSession({
      query: activeQuery,
      deep: false,
      status: 'PROCESSING',
      taskId: null,
      progress: 40,
      stage: 'Listening for matches...',
      error: null,
      results: [],
      updatedAt: new Date().toISOString(),
    });

    try {
      const data = await sileo.promise(quickSearchMutation.mutateAsync(activeQuery), {
        loading: {
          title: 'Listening to the archive...',
          description: 'The vault is tuning itself to your query.',
        },
        success: () => ({
          title: 'Search Complete',
          description: 'The strongest echoes are now in view.',
        }),
        error: {
          title: 'Search Failed',
          description: 'The archive could not answer that query right now.',
        }
      });

      setSearchSession({
        query: activeQuery,
        deep: false,
        status: 'READY',
        taskId: null,
        progress: 100,
        stage: 'Search complete',
        error: null,
        results: data,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      patchSearchSession({
        status: 'FAILED',
        progress: 0,
        stage: 'Search failed',
        error: 'The archive could not answer that query right now.',
      });
    }
  };

  const cancelSearch = async () => {
    const taskId = searchSession.taskId;
    patchSearchSession({
      status: 'CANCELLED',
      taskId: null,
      progress: 0,
      stage: 'Search cancelled',
      error: 'Search cancelled.',
    });

    if (!taskId) return;

    try {
      await cancelTask(taskId);
      sileo.info({ title: 'Search Cancelled' });
    } catch {
      sileo.error({ title: 'Cancel Failed', description: 'The worker may already have finished this search.' });
    }
  };

  const clearSearch = () => {
    if (searchSession.status === 'PROCESSING') {
      void cancelSearch();
    }
    setQuery('');
    resetSearchSession();
    setSelectedMemory(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleMemoryUpdate = (updatedMemory: any) => {
    const normalizedMemory = normalizeMemory(updatedMemory);
    setSelectedMemory(normalizedMemory);
    patchSearchSession({
      results: searchSession.results.map((memory) =>
        memory.id === updatedMemory.id ? { ...memory, ...normalizedMemory } : memory
      ),
    });
  };

  const loadingMessage = AI_THINKING_STEPS[thinkingStep] || "Curating memories...";

  return (
    <div className="min-h-screen zone-light pt-[120px] pb-24 px-[clamp(24px,5vw,80px)] flex flex-col relative overflow-hidden">
      <MemoryDetailModal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)} memory={selectedMemory} onUpdate={handleMemoryUpdate} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--clr-gold)] rounded-full blur-[200px] opacity-[0.03] pointer-events-none" />

      <div className={`max-w-[800px] mx-auto w-full transition-all duration-700 ease-[var(--ease-out)] ${hasSearched ? 'mb-12 scale-95' : 'mb-24 mt-[10vh] scale-100'}`}>
        <motion.div layout className="text-center mb-12">
          <h1 className="font-display font-semibold text-[clamp(2rem,4vw,3rem)] text-[var(--clr-ink)] tracking-[0.03em] uppercase drop-shadow-sm">The Curator's Desk</h1>
          <AnimatePresence mode="wait">
            {!hasSearched && !isProcessing && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5] mt-4 overflow-hidden">
                "Describe a moment..."
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.form layout onSubmit={handleSearch} className={`relative z-20 transition-all duration-500 rounded-full ${isFocused || isProcessing || quickSearchMutation.isPending || deepSearchMutation.isPending ? 'shadow-[0_20px_45px_rgba(62,41,18,0.18)] scale-[1.02]' : 'shadow-[0_14px_30px_rgba(62,41,18,0.12)] scale-100'}`}>
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]">
            {isProcessing || quickSearchMutation.isPending || deepSearchMutation.isPending ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkle size={28} weight="fill" /></motion.div>
            ) : (
              <Sparkle size={28} weight={isFocused ? "fill" : "regular"} className="transition-all duration-300" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={quickSearchMutation.isPending || deepSearchMutation.isPending}
            placeholder="Try: 'Dad laughing in the rain during the 80s...'"
            className="w-full bg-[rgba(255,252,247,0.98)] border-2 border-[rgba(96,72,45,0.26)] rounded-full pl-16 pr-20 py-6 text-[18px] text-[var(--clr-ink)] font-ui outline-none focus:border-[var(--clr-gold)] focus:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          />

          <AnimatePresence>
            {query && !quickSearchMutation.isPending && !deepSearchMutation.isPending && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} type="button" onClick={clearSearch} className="absolute right-20 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--clr-paper)] text-[var(--clr-dust)] hover:text-[var(--clr-danger)] hover:bg-[rgba(139,58,58,0.1)] flex items-center justify-center transition-colors"><X size={16} weight="bold" /></motion.button>
            )}
          </AnimatePresence>
          <button type="submit" disabled={!query.trim() || quickSearchMutation.isPending || deepSearchMutation.isPending} className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-[var(--clr-gold)] text-white rounded-full flex items-center justify-center shadow-[var(--shadow-md)] hover:bg-[var(--clr-gold-light)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"><MagnifyingGlass size={24} weight="bold" /></button>
        </motion.form>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setUseDeepSearch((current) => !current)}
            className={`group relative inline-flex items-center gap-3 rounded-full border px-4 py-2 transition-all ${useDeepSearch ? 'border-[rgba(184,143,91,0.42)] bg-[rgba(184,143,91,0.14)] text-[var(--clr-gold-dark)] shadow-[0_10px_24px_rgba(184,143,91,0.12)]' : 'border-[rgba(96,72,45,0.18)] bg-[rgba(255,255,255,0.94)] text-[var(--clr-dust)] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold-dark)] shadow-[0_10px_22px_rgba(62,41,18,0.05)]'}`}
            aria-pressed={useDeepSearch}
          >
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${useDeepSearch ? 'border-[rgba(184,143,91,0.45)] bg-[var(--clr-gold)]' : 'border-[rgba(96,72,45,0.18)] bg-[rgba(245,239,231,0.98)]'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${useDeepSearch ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
            <span className="font-ui text-[12px] uppercase tracking-[0.16em]">Deep search</span>
            <Info size={14} weight="bold" />
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-20 w-[320px] -translate-x-1/2 rounded-[var(--radius-lg)] border border-[rgba(96,72,45,0.18)] bg-white px-4 py-3 text-left font-ui text-[12px] leading-relaxed text-[var(--clr-ink)] opacity-0 shadow-[0_16px_40px_rgba(62,41,18,0.14)] transition-opacity group-hover:opacity-100">
              Deep search looks through extracted document text, AI captions, visual tags, and other available clues for broader matches.
            </span>
          </button>
        </div>

        <AnimatePresence>
          {!hasSearched && !isProcessing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mt-12 flex flex-wrap justify-center gap-3">
              <p className="w-full text-center font-ui text-[11px] uppercase tracking-widest text-[var(--clr-dust)] mb-2">Or explore these vibes</p>
              {suggestions.map((tag: string) => (
                <button key={tag} onClick={() => handleSearch(undefined, tag)} className="px-5 py-2.5 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] text-[var(--clr-ink)] font-ui text-[13px] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold-dark)] hover:shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5">"{tag}"</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 px-2 py-1">
                <span className="inline-block w-2.5 h-5 bg-[var(--clr-gold)] animate-pulse" />
                <span className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold-dark)]">
                  {loadingMessage}
                </span>
                <button
                  type="button"
                  onClick={cancelSearch}
                  className="ml-2 inline-flex items-center justify-center rounded-full border border-[rgba(139,58,58,0.28)] px-3 py-1 font-ui text-[10px] uppercase tracking-[0.14em] text-[var(--clr-danger)] hover:bg-[rgba(139,58,58,0.08)] transition-colors"
                >
                  Cancel
                </button>
              </div>

              {searchSession.deep && searchSession.status === 'PROCESSING' && (
                <div className="mt-4 mx-auto w-full max-w-[520px]">
                  <div className="h-2 rounded-full bg-[rgba(184,143,91,0.12)] overflow-hidden">
                    <motion.div
                    className="h-full bg-[var(--clr-gold)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(searchSession.progress || 0, 100)}%` }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                  <p className="mt-2 font-ui text-[11px] uppercase tracking-[0.16em] text-[var(--clr-dust)]">
                    {searchSession.stage || 'Reading the archive...'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {hasSearched && searchSession.status === 'READY' && (
          <motion.div key="results" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="max-w-[var(--max-width)] mx-auto w-full flex-1">
            {results.length > 0 ? (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-[var(--clr-aged)] gap-6">
                  <div>
                    <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-ink)]">{results.length} RESULTS FOUND</h2>
                    <p className="font-script text-[36px] text-[var(--clr-dust)] leading-[0.5] mt-2">"For: {searchSession.query}"</p>
                  </div>
                  <div className="bg-[rgba(255,252,247,0.98)] border border-[rgba(96,72,45,0.18)] rounded-[var(--radius-lg)] p-4 max-w-[400px] flex gap-3 items-start shadow-[0_12px_28px_rgba(62,41,18,0.06)]">
                    <Sparkle size={20} weight="fill" className="text-[var(--clr-gold)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-ui text-[10px] uppercase font-bold tracking-widest text-[var(--clr-gold-dark)] mb-1">AI Insight</p>
                      <p className="font-ui text-[12px] text-[var(--clr-ink)] leading-relaxed">Matches are ranked by semantic meaning, exact phrases, names, tags, OCR/object text, dates, fuzzy token overlap, and contextual reranking. Deep search also includes extracted document text when available.</p>
                    </div>
                  </div>
                </div>
                <div className="columns-1 md:columns-2 lg:columns-3 gap-[var(--space-6)] space-y-[var(--space-6)]">
                  {normalizedResults.map((memory, i) => (
                    <motion.div key={memory.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="break-inside-avoid">
                      <div className="cursor-pointer group" onClick={() => setSelectedMemory(memory)}>
                        <MemoryCard memory={{
                          ...memory,
                          url: memory.url || '/placeholder-museum.jpg',
                          tags: (memory.tags || []).slice(0, 3)
                        }} />
                        {!!memory.searchReasons?.length && (
                          <div className="mt-3 rounded-[var(--radius-lg)] border border-[rgba(96,72,45,0.14)] bg-[rgba(255,252,247,0.98)] px-4 py-3 shadow-[0_8px_24px_rgba(62,41,18,0.06)]">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <p className="font-ui text-[10px] uppercase font-bold tracking-[0.22em] text-[var(--clr-gold-dark)]">Why this matched</p>
                              {typeof memory.searchScore === 'number' && (
                                <span className="font-ui text-[10px] uppercase tracking-[0.18em] text-[var(--clr-dust)]">
                                  Score {memory.searchScore.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {memory.searchReasons.slice(0, 4).map((reason: string) => (
                                <span
                                  key={reason}
                                  className="inline-flex items-center rounded-full border border-[rgba(96,72,45,0.16)] bg-white px-3 py-1 font-ui text-[11px] text-[var(--clr-ink)] shadow-sm"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-24 max-w-[500px] mx-auto">
                <div className="w-20 h-20 bg-[var(--clr-paper)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--clr-aged)]">
                    <Binoculars size={32} />
                </div>
                <h3 className="font-display text-[2rem] text-[var(--clr-ink)] mb-2">
                    {allMemories.some((m: any) => !m.is_indexed) ? "AI STILL INDEXING" : "NOTHING FOUND"}
                </h3>
                <p className="font-ui text-[14px] text-[var(--clr-dust)] mb-8">
                    {allMemories.some((m: any) => !m.is_indexed)
                        ? "Some artifacts are still being visually indexed by the AI. Please wait a few moments for full vibe-search capability."
                        : `The curator couldn't find anything matching exactly "${searchSession.query}".`}
                </p>
                <button onClick={clearSearch} className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-gold)] border border-[var(--clr-gold)] px-8 py-3 rounded-full hover:bg-[rgba(184,143,91,0.1)] transition-colors inline-flex items-center gap-2"><ArrowRight size={16} /> Search Again</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasSearched && searchSession.status === 'FAILED' && !isProcessing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[720px] mx-auto mt-8 rounded-[var(--radius-lg)] border border-[rgba(139,58,58,0.22)] bg-[rgba(255,247,247,0.98)] px-5 py-4 text-center shadow-[0_12px_28px_rgba(139,58,58,0.06)]">
            <p className="font-ui text-[12px] uppercase tracking-[0.18em] text-[var(--clr-danger)] mb-2">Search stalled</p>
            <p className="font-ui text-[13px] text-[var(--clr-dust)]">{searchSession.error || 'The archive could not complete that search.'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasSearched && searchSession.status === 'CANCELLED' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[720px] mx-auto mt-8 rounded-[var(--radius-lg)] border border-[rgba(96,72,45,0.16)] bg-[rgba(255,252,247,0.98)] px-5 py-4 text-center shadow-[0_12px_28px_rgba(62,41,18,0.06)]">
            <p className="font-ui text-[12px] uppercase tracking-[0.18em] text-[var(--clr-gold-dark)] mb-2">Search cancelled</p>
            <button onClick={clearSearch} className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-gold)] border border-[var(--clr-gold)] px-6 py-2 rounded-full hover:bg-[rgba(184,143,91,0.1)] transition-colors inline-flex items-center gap-2"><ArrowRight size={16} /> Search Again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

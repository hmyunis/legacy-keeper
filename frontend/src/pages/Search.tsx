import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Sparkle, X, ArrowRight, BookOpen } from '@phosphor-icons/react';
import MemoryCard from '../components/vault/MemoryCard';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';

// ============================================================================
// MOCK DATA & VIBES
// ============================================================================
const SUGGESTED_VIBES = [
  "A sunny afternoon in the 90s",
  "Weddings and celebrations",
  "Dad playing the guitar",
  "Rainy days in Addis Ababa",
  "Childhood mischief",
];

const MOCK_RESULTS = [
  { id: 1, url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600', title: 'The Wedding', location: 'Addis Ababa', date: 'July 1954', tags: ['Marriage', 'Vintage', 'Joy'], people: ['Abebe Kebede', 'Fatima Haile'], aiCaption: 'A beautifully preserved moment from the 1954 wedding reception.' },
  { id: 2, url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=600', title: 'Graduation Day', location: 'Harar', date: 'June 1962', tags: ['Education', 'Proud'], people: ['Yohannes Kebede'], aiCaption: 'Yohannes holding his degree outside the Harar university gates.' },
  { id: 3, url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=600', title: 'Family Picnic', location: 'Entoto', date: 'August 1975', tags: ['Summer', 'Outdoors'], people: ['Abebe Kebede', 'Sara Kebede'], aiCaption: 'A warm summer afternoon picnic with the family spread out on a blanket.' },
  { id: 4, url: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=600', title: 'Moving to the City', location: 'Dire Dawa', date: 'March 1982', tags: ['Travel', 'New Beginnings'], people: ['Fatima Haile'], aiCaption: 'Packing up the old station wagon for the big move.' },
  { id: 5, url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600', title: 'First Car', location: 'Addis Ababa', date: '1968', tags: ['Milestone'], people: ['Abebe Kebede'], aiCaption: 'Proudly standing next to the first family automobile.' },
  { id: 6, url: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?q=80&w=600', title: 'Festival of Lights', location: 'Gondar', date: 'September 1985', tags: ['Festival', 'Night'], people: ['Sara Kebede', 'Yohannes Kebede'], aiCaption: 'Vibrant lights illuminating the night during the Gondar festival.' },
];

const AI_THINKING_STEPS = [
  "Scanning visual vectors...",
  "Reading handwritten notes...",
  "Analyzing facial expressions...",
  "Consulting the archives...",
  "Curating your memories..."
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function Search() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<typeof MOCK_RESULTS>([]);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);


  const inputRef = useRef<HTMLInputElement>(null);


  // Simulate AI Semantic Search
  const handleSearch = (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = forceQuery || query;


    if (!activeQuery.trim()) return;


    if (forceQuery) setQuery(forceQuery);


    setIsSearching(true);
    setHasSearched(false);
    setResults([]);
    setThinkingStep(0);
    inputRef.current?.blur();


    // Cycle through AI thinking steps to create immersion
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < AI_THINKING_STEPS.length) {
        setThinkingStep(step);
      }
    }, 400);


    // Resolve search after 2 seconds
    setTimeout(() => {
      clearInterval(interval);
      // Randomize results slightly for demo purposes
      const shuffled = [...MOCK_RESULTS].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 2);
      setResults(shuffled);
      setIsSearching(false);
      setHasSearched(true);
    }, 2200);
  };


  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };


  return (
    <div className="min-h-screen zone-light pt-[120px] pb-24 px-[clamp(24px,5vw,80px)] flex flex-col relative overflow-hidden">

      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
      />

      {/* Background Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--clr-gold)] rounded-full blur-[200px] opacity-[0.03] pointer-events-none" />


      {/* ======================= HERO & SEARCH BAR ======================= */}
      <div className={`max-w-[800px] mx-auto w-full transition-all duration-700 ease-[var(--ease-out)] ${hasSearched ? 'mb-12 scale-95' : 'mb-24 mt-[10vh] scale-100'}`}>


        <motion.div layout className="text-center mb-12">
          <h1 className="font-display font-semibold text-[clamp(2rem,4vw,3rem)] text-[var(--clr-ink)] tracking-[0.03em] uppercase drop-shadow-sm">
            The Curator's Desk
          </h1>
          <AnimatePresence mode="wait">
            {!hasSearched && !isSearching && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5] mt-4 overflow-hidden"
              >
                "Describe a moment..."
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>


        {/* The Search Input */}
        <motion.form
          layout
          onSubmit={handleSearch}
          className={`relative z-20 transition-all duration-500 rounded-full ${isFocused || isSearching ? 'shadow-[var(--shadow-gold)] scale-[1.02]' : 'shadow-[var(--shadow-lg)] scale-100'}`}
        >
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]">
            {isSearching ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Sparkle size={28} weight="fill" />
              </motion.div>
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
            disabled={isSearching}
            placeholder="Try: 'Dad laughing in the rain during the 80s...'"
            className="w-full bg-[var(--clr-linen)] border-2 border-[var(--clr-aged)] rounded-full pl-16 pr-20 py-6 text-[18px] text-[var(--clr-ink)] font-ui outline-none focus:border-[var(--clr-gold)] focus:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          />


          <AnimatePresence>
            {query && !isSearching && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                type="button" onClick={clearSearch}
                className="absolute right-20 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--clr-paper)] text-[var(--clr-dust)] hover:text-[var(--clr-danger)] hover:bg-[rgba(139,58,58,0.1)] flex items-center justify-center transition-colors"
              >
                <X size={16} weight="bold" />
              </motion.button>
            )}
          </AnimatePresence>


          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-[var(--clr-gold)] text-white rounded-full flex items-center justify-center shadow-[var(--shadow-md)] hover:bg-[var(--clr-gold-light)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            <MagnifyingGlass size={24} weight="bold" />
          </button>
        </motion.form>


        {/* AI Vibe Suggestions (Hidden when searching or resulted) */}
        <AnimatePresence>
          {!hasSearched && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mt-12 flex flex-wrap justify-center gap-3"
            >
              <p className="w-full text-center font-ui text-[11px] uppercase tracking-widest text-[var(--clr-dust)] mb-2">Or explore these vibes</p>
              {SUGGESTED_VIBES.map((vibe, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(undefined, vibe)}
                  className="px-5 py-2.5 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] text-[var(--clr-ink)] font-ui text-[13px] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold-dark)] hover:shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5"
                >
                  "{vibe}"
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>


        {/* AI Thinking State */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-8 text-center"
            >
              <p className="font-display text-[1.25rem] text-[var(--clr-gold-dark)] italic">
                {AI_THINKING_STEPS[thinkingStep]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* ======================= RESULTS AREA ======================= */}
      <AnimatePresence mode="wait">
        {hasSearched && !isSearching && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[var(--max-width)] mx-auto w-full flex-1"
          >
            {results.length > 0 ? (
              <>
                {/* Result Header & AI Insight */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-[var(--clr-aged)] gap-6">
                  <div>
                    <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-ink)]">
                      {results.length} RESULTS FOUND
                    </h2>
                    <p className="font-script text-[36px] text-[var(--clr-dust)] leading-[0.5] mt-2">
                      "For: {query}"
                    </p>
                  </div>


                  <div className="bg-[rgba(184,143,91,0.08)] border border-[rgba(184,143,91,0.3)] rounded-[var(--radius-lg)] p-4 max-w-[400px] flex gap-3 items-start">
                    <Sparkle size={20} weight="fill" className="text-[var(--clr-gold)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-ui text-[10px] uppercase font-bold tracking-widest text-[var(--clr-gold-dark)] mb-1">AI Insight</p>
                      <p className="font-ui text-[12px] text-[var(--clr-dust)] leading-relaxed">
                        Matches generated using semantic visual analysis, location context, and emotional tone extraction—not just exact tags.
                      </p>
                    </div>
                  </div>
                </div>


                {/* Masonry-style Grid */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-[var(--space-6)] space-y-[var(--space-6)]">
                  {results.map((memory, i) => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="break-inside-avoid"
                    >
                      <div className="cursor-pointer" onClick={() => setSelectedMemory(memory)}>
                        <MemoryCard memory={{...memory, tags: memory.tags.slice(0, 3)}} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-24 max-w-[500px] mx-auto">
                <div className="w-20 h-20 bg-[var(--clr-paper)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--clr-aged)]">
                  <BookOpen size={32} className="text-[var(--clr-dust)]" weight="thin" />
                </div>
                <h3 className="font-display text-[2rem] text-[var(--clr-ink)] mb-2">NOTHING FOUND YET</h3>
                <p className="font-script text-[40px] text-[var(--clr-dust)] leading-[0.5] mb-6">"But the memory might still be waiting"</p>
                <p className="font-ui text-[14px] text-[var(--clr-dust)] mb-8">
                  The curator couldn't find anything matching exactly <strong className="text-[var(--clr-ink)]">"{query}"</strong>. Try rephrasing or exploring broader eras.
                </p>
                <button onClick={clearSearch} className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-gold)] border border-[var(--clr-gold)] px-8 py-3 rounded-full hover:bg-[rgba(184,143,91,0.1)] transition-colors inline-flex items-center gap-2">
                  <ArrowRight size={16} /> Search Again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
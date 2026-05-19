import {  MagicWand, TreeStructure, LockKey, MagnifyingGlass, CaretDown, BookOpen, Vault, Hourglass, UsersThree } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const CATEGORIES = [
  {
    id: 'wings',
    icon: <Vault />,
    title: 'The Exhibition Wings',
    desc: 'Navigating the Vault, Museum Hall, and Chronology.',
    content: 'The platform is divided into distinct visual experiences. The "Vault" is your active workspace, where memories orbit in 3D clusters categorized by AI. The "Museum Hall" is a first-person immersive gallery where you can walk through the decades. "Chronology" lays out every artifact on a vertical timeline.'
  },
  {
    id: 'ai',
    icon: <MagicWand />,
    title: 'The AI Curator',
    desc: 'Auto-captioning, restoration, and clustering.',
    content: 'When you upload an artifact, the AI Curator runs multiple models in the background. It restores degraded photos, detects faces, and generates a poetic caption based on the scene and EXIF data. It automatically groups memories into thematic clusters (e.g., "Gatherings", "Milestones").'
  },
  {
    id: 'tree',
    icon: <TreeStructure />,
    title: 'Living Lineage & Pacts',
    desc: 'Building family trees and federated vault linking.',
    content: 'The Living Lineage is an interactive D3 node-map of your family. You can add relatives directly to the tree. If your spouse or extended family has their own LegacyKeeper vault, you can send them a "Lineage Pact" from the Governance page to securely merge your trees together while keeping your artifacts private.'
  },
  {
    id: 'capsules',
    icon: <Hourglass />,
    title: 'Time Capsules',
    desc: 'Sealing messages for the future.',
    content: 'A Time Capsule encrypts specific artifacts and a written letter until a predetermined unlock date. Once sealed, neither you nor the system administrators can view the contents. On the unlock date, you will receive a Push Notification and the capsule will shatter in the 3D space, revealing the memories.'
  },
  {
    id: 'search',
    icon: <MagnifyingGlass />,
    title: 'Semantic "Vibe" Search',
    desc: 'Finding memories using natural language.',
    content: 'Traditional search relies on file names. Our Vibe Search uses CLIP vector embeddings. You can search for abstract concepts like "A rainy afternoon in the 80s" or "Dad looking proud", and the AI will mathematically calculate which artifacts match the emotional tone of your query.'
  },
  {
    id: 'gov',
    icon: <LockKey />,
    title: 'Governance & Privacy',
    desc: 'Managing access, roles, and the registry.',
    content: 'As the Vault Admin, you have absolute control. You can invite kin as "Contributors" (can upload) or "Viewers" (read-only). Every action taken in the vault—from uploads to deletions to settings changes—is permanently recorded in the Vault Registry log, which you can export as a CSV.'
  },
];

const FAQS = [
  { q: "Where is my data physically stored?", a: "LegacyKeeper is self-hosted. Your artifacts are stored exactly where you deployed the application (e.g., your local machine or personal VPS via MinIO). We have no access to your vault." },
  { q: "How do I trigger the photo restoration?", a: "Open any memory in the Vault or Museum to view its details. If the AI determines the photo is degraded, a 'Restored' layer will automatically be generated, and you can use the slider to compare the original with the enhanced version." },
  { q: "What happens if I forget my password?", a: "Because vaults are cryptographically secured, you must use the 'Forgot Key' link on the login page. An email with a 9-digit recovery code will be dispatched to verify your identity." },
  { q: "Can I remove duplicates?", a: "Yes. Navigate to 'Curator Settings' > 'Vault Health'. The Smart Purge feature uses perceptual hashing (pHash) to detect identical burst photos and automatically removes the redundant files to save storage." }
];

export default function Help() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[var(--max-width)] mx-auto">

        <header className="text-center mb-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--clr-gold)] rounded-full blur-[120px] opacity-10 pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--clr-gold-muted)] border border-[rgba(184,143,91,0.3)] rounded-full text-[var(--clr-gold-dark)] font-bold text-[10px] uppercase tracking-widest mb-6 shadow-sm relative z-10">
            <BookOpen size={14} weight="fill" /> Knowledge Base
          </div>
          <h1 className="font-display text-[3.5rem] font-bold uppercase tracking-tight text-[var(--clr-ink)] relative z-10 leading-none">
            Museum Guidebook
          </h1>
          <p className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5] mt-6 relative z-10">
            "Mastering your family archive"
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex flex-col">
              <motion.button
                onClick={() => setActiveId(activeId === cat.id ? null : cat.id)}
                whileHover={{ y: -6 }}
                className={`p-8 bg-[var(--clr-linen)] border rounded-[var(--radius-lg)] text-left group transition-all h-full shadow-sm ${activeId === cat.id ? 'border-[var(--clr-gold)] shadow-[var(--shadow-gold)]' : 'border-[var(--clr-aged)] hover:border-[var(--clr-gold)]'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-6 transition-colors border border-[rgba(184,143,91,0.3)] ${activeId === cat.id ? 'bg-[var(--clr-gold)] text-white' : 'bg-[var(--clr-paper)] text-[var(--clr-gold-dark)] group-hover:bg-[var(--clr-gold)] group-hover:text-white'}`}>
                  {cat.icon}
                </div>
                <h3 className="font-display font-bold text-[1.5rem] text-[var(--clr-ink)] mb-3 flex items-center justify-between">
                  {cat.title}
                  <CaretDown size={18} className={`transition-transform text-[var(--clr-gold)] ${activeId === cat.id ? 'rotate-180' : ''}`} />
                </h3>
                <p className="font-ui text-[13px] text-[var(--clr-dust)] leading-relaxed font-medium">{cat.desc}</p>

                <AnimatePresence>
                  {activeId === cat.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-6 border-t border-[var(--clr-aged)]">
                        <p className="font-ui text-[14px] text-[var(--clr-ink)] leading-[1.8] italic bg-[var(--clr-paper)] p-4 rounded-xl border-l-2 border-[var(--clr-gold)]">
                          {cat.content}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          ))}
        </div>

        <div className="mt-32 max-w-3xl mx-auto space-y-12 bg-[var(--clr-linen)] p-12 rounded-[var(--radius-lg)] border border-[var(--clr-aged)] shadow-md">
          <div className="text-center mb-10 border-b border-[var(--clr-aged)] pb-8">
            <UsersThree size={48} weight="thin" className="mx-auto text-[var(--clr-gold)] mb-4" />
            <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[var(--clr-ink)]">Common Inquiries</h2>
          </div>

          <div className="space-y-10">
            {FAQS.map((item, i) => (
              <div key={i} className="space-y-4">
                <h4 className="font-display font-bold text-[1.25rem] text-[var(--clr-gold-dark)] flex gap-3">
                  <span className="text-[var(--clr-dust)] opacity-50">Q.</span> {item.q}
                </h4>
                <p className="font-ui text-[15px] text-[var(--clr-ink)] leading-[1.8] pl-8">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

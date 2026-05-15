import { useState } from 'react';
import { UserFocus, Palette, Database, MagicWand, Trash, Warning, Sparkle, CheckCircle } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('HEALTH');
  const [isPurging, setIsPurging] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#B88F5B');
  const [grainEnabled, setGrainEnabled] = useState(true);

  const handleSmartPurge = () => {
    setIsPurging(true);
    sileo.info({ title: "Scanning", description: "AI curator is analyzing redundancy..." });

    setTimeout(() => {
      setIsPurging(false);
      sileo.success({ title: "Culling Complete", description: "142 MB reclaimed from the vault." });
    }, 3000);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    sileo.success({ title: "Palette Updated", description: `Museum hue changed to ${color}.` });
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    sileo.success({ title: "Identity Updated", description: "Your profile has been saved." });
  };

  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[var(--max-width)] mx-auto flex flex-col lg:flex-row gap-12">

        {/* Sidebar Nav */}
        <aside className="w-full lg:w-[240px] space-y-2">
          <h2 className="font-display text-xl uppercase tracking-widest mb-8 text-[var(--clr-ink)]">Curator Settings</h2>
          {[
            { id: 'ACCOUNT', label: 'Identity', icon: <UserFocus /> },
            { id: 'THEME', label: 'Appearance', icon: <Palette /> },
            { id: 'HEALTH', label: 'Vault Health', icon: <Database /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-ui font-bold text-[11px] uppercase tracking-[0.1em] transition-all ${
                activeTab === item.id ? 'bg-[var(--clr-gold)] text-white shadow-lg' : 'text-[var(--clr-dust)] hover:bg-[var(--clr-gold-muted)] hover:text-[var(--clr-gold-dark)]'
              }`}
            >
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">

            {/* AI CULLING (The "Wow" Section) */}
            {activeTab === 'HEALTH' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <div className="flex items-center gap-2 text-[var(--clr-gold-dark)] font-bold text-[10px] uppercase tracking-widest mb-2">
                    <MagicWand size={16} weight="fill" /> AI-Driven Optimization
                  </div>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)]">Storage Health</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">AI has identified redundant or low-quality artifacts to save space.</p>
                </header>

                <div className="p-6 bg-[var(--clr-paper)] rounded-3xl border-l-4 border-[var(--clr-warning)] flex items-start gap-5">
                  <Warning size={32} className="text-[var(--clr-warning)] shrink-0" />
                  <div>
                    <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">12 Redundant Groups Found</p>
                    <p className="font-ui text-[12px] text-[var(--clr-dust)] mt-1">
                      You have several bursts of similar photos. Cleaning these could reclaim <strong className="text-[var(--clr-ink)]">142 MB</strong> of storage.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                   <p className="font-ui text-[11px] font-black uppercase tracking-widest text-[var(--clr-fog)]">Suggested Culling</p>
                   {/* Mock Culling Card */}
                   <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-2xl p-4 flex gap-4 items-center group">
                      <div className="relative w-20 h-20 shrink-0">
                        <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200" className="w-full h-full object-cover rounded-lg grayscale opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                          <Trash size={24} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-[15px]">Group: Wedding 1954</p>
                        <p className="font-ui text-[12px] text-[var(--clr-dust)]">4 nearly identical shots found. AI suggests keeping only the sharpest.</p>
                      </div>
                      <Button variant="ghost" className="text-[9px] px-4 py-2" onClick={() => sileo.info({ title: "Viewing Group", description: "Opening group detail for review." })}>REVIEW</Button>
                   </div>
                </div>

                <div className="pt-8 border-t border-[var(--clr-aged)] flex justify-between items-center">
                   <div className="flex items-center gap-2 text-[var(--clr-gold)] font-bold text-[11px] uppercase tracking-widest">
                     <Sparkle size={14} weight="fill" /> Auto-clean enabled
                   </div>
                   <Button variant="primary" onClick={handleSmartPurge} disabled={isPurging}>
                     {isPurging ? 'PURGING...' : 'START SMART PURGE'}
                   </Button>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeTab === 'THEME' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Gallery Aesthetics</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">Customize the visual tone of your private museum.</p>
                </header>

                <div className="space-y-6">
                  <p className="font-ui text-[11px] font-black uppercase tracking-widest text-[var(--clr-fog)]">Primary Hue</p>
                  <div className="flex gap-4">
                    {['#B88F5B', '#4A7C59', '#3A5F7A', '#8B3A3A', '#1E1A17'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        style={{ backgroundColor: color }}
                        className={`w-10 h-10 rounded-full border-4 shadow-lg transform transition-all active:scale-95 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-[var(--clr-aged)]">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Dynamic Museum Grain</p>
                       <p className="font-ui text-[12px] text-[var(--clr-dust)]">Apply subtle film-grain overlays to the Light Zone.</p>
                     </div>
                     <div
                       onClick={() => { setGrainEnabled(!grainEnabled); sileo.success({ title: "Grain Toggled", description: `Dynamic museum grain ${!grainEnabled ? 'enabled' : 'disabled'}.` }); }}
                       className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${grainEnabled ? 'bg-[var(--clr-gold)]' : 'bg-[var(--clr-aged)]'}`}
                     >
                         <motion.div animate={{ x: grainEnabled ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* Other tabs simplified for the demo... */}
            {activeTab === 'ACCOUNT' && (
              <form onSubmit={handleSaveAccount} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Curator Identity</h3>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Legal Name</label>
                    <input defaultValue="Abebe Kebede" className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Email Address</label>
                    <input defaultValue="abebe@family.com" className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                </div>
                <div className="pt-6 border-t border-[var(--clr-aged)]">
                  <Button variant="primary">SAVE IDENTITY</Button>
                </div>
              </form>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
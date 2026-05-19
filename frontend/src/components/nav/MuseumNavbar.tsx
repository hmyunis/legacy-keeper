import { useState, useEffect } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  X,
  Bell,
  MagnifyingGlass,
  Buildings,
  Vault,
  ClockCounterClockwise,
  TreeStructure,
  Hourglass,
  Scroll,
  SignOut,
  Gear,
  Sparkle,
  Compass,
  ArrowRight,
  ShieldCheck,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore';
import { useLogs } from '../../features/governance/hooks/useGovernance';
import { formatDistanceToNow } from 'date-fns';
import { useDebouncedValue } from '../../lib/debounce';

export type NavMode = 'public' | 'app';

interface MuseumNavbarProps {
  mode: NavMode;
}

const WINGS = [
  {
    path: '/museum',
    label: 'Museum Hall',
    hint: 'Immersive Gallery',
    icon: Buildings,
    bg: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2000',
    desc: 'Step into a 3D corridor of time. Traverse the decades and view your family\'s history as a curated art exhibition.'
  },
  {
    path: '/vault',
    label: 'Memory Vault',
    hint: 'Curate & Preserve',
    icon: Vault,
    bg: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000',
    desc: 'The celestial archive. Manage clusters of artifacts in 3D orbit and let AI assist in colorizing and captioning your legacy.'
  },
  {
    path: '/tree',
    label: 'Living Lineage',
    hint: 'Family Roots',
    icon: TreeStructure,
    bg: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2000',
    desc: 'An organic, botanical representation of your bloodline. Watch branches grow and leaves breathe as your family expands.'
  },
  {
    path: '/timeline',
    label: 'Chronology',
    hint: 'Through the Ages',
    icon: ClockCounterClockwise,
    bg: 'https://images.unsplash.com/photo-1507608158173-1dcec673a2e5?q=80&w=2000',
    desc: 'A vertical ribbon of existence. See every milestone connected to a physical thread of time, from the 1950s to today.'
  },
  {
    path: '/capsules',
    label: 'Time Capsules',
    hint: 'Sealed Moments',
    icon: Hourglass,
    bg: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=2000',
    desc: 'Ceremonial vessels for the future. Seal photos and letters with a digital wax stamp, intended for eyes years from now.'
  },
];

export function MuseumNavbar({ mode }: MuseumNavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isWingsOpen, setIsWingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setMounted(true); }, []);

  const closeAll = () => {
    setIsWingsOpen(false); setIsNotifOpen(false); setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (isWingsOpen || isNotifOpen || isProfileOpen) ? 'hidden' : '';
  }, [isWingsOpen, isNotifOpen, isProfileOpen]);

  useEffect(() => { closeAll(); }, [currentPath]);

  if (!mounted) return null;

  return (
    <>
      <PersistentControls
        mode={mode}
        onOpenWings={() => setIsWingsOpen(true)}
        onOpenNotifs={() => setIsNotifOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <AnimatePresence>
        {isWingsOpen && <CinematicDirectory onClose={closeAll} />}
        {isNotifOpen && <RegistryDrawer onClose={closeAll} />}
        {isProfileOpen && <IdentityDrawer onClose={closeAll} />}
      </AnimatePresence>
    </>
  );
}

function PersistentControls({ mode, onOpenWings, onOpenNotifs, onOpenProfile }: any) {
  const [isCompassHovered, setIsCompassHovered] = useState(false);
  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [publicDropdownOpen, setPublicDropdownOpen] = useState(false);

  const { currentUser, logout } = useAuthStore();
  const profileAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${(currentUser?.fullName || 'Curator').replace(/ /g, '+')}&background=B88F5B&color=fff`;

  return (
    <div className="fixed inset-0 z-[45] pointer-events-none flex flex-col justify-between p-[clamp(20px,4vw,40px)]">

      <div className="flex justify-between items-start w-full">
        <Link to="/" className="pointer-events-auto group flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-[var(--clr-gold)] bg-[rgba(20,18,17,0.6)] backdrop-blur-md flex items-center justify-center shadow-lg">
            <span className="font-display font-bold text-[18px] text-[var(--clr-linen)] tracking-widest">LK</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-display text-[16px] font-bold text-[var(--clr-linen)] drop-shadow-md">LEGACY<span className="text-[var(--clr-gold)]">KEEPER</span></span>
            <span className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-fog)] font-bold drop-shadow-md">Memory Museum</span>
          </div>
        </Link>

        {mode === 'public' && !currentUser && (
          <Link to="/auth" className="pointer-events-auto">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[rgba(184,143,91,0.3)] bg-[rgba(20,18,17,0.6)] px-6 font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--clr-linen)] shadow-lg backdrop-blur-md transition-colors hover:text-[var(--clr-gold)]"
            >
              Sign In
            </motion.span>
          </Link>
        )}

        {mode === 'public' && currentUser && (
          <div className="relative pointer-events-auto">
            <motion.button
              onClick={() => setPublicDropdownOpen(!publicDropdownOpen)}
              whileHover={{ scale: 1.05 }}
              className="w-12 h-12 rounded-full border border-[var(--clr-gold)] overflow-hidden shadow-lg cursor-pointer"
            >
              <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </motion.button>

            <AnimatePresence>
              {publicDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-14 right-0 mt-2 w-48 bg-[rgba(20,18,17,0.9)] backdrop-blur-xl border border-[rgba(184,143,91,0.3)] rounded-2xl shadow-2xl py-2 flex flex-col z-50 overflow-hidden"
                >
                  <Link to="/dashboard" className="px-5 py-3 text-left font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-linen)] hover:bg-[var(--clr-gold)] hover:text-[var(--clr-charcoal)] transition-colors">The Grand Hall</Link>
                  <div className="w-full h-[1px] bg-[rgba(184,143,91,0.2)] my-1" />
                  <button onClick={() => { logout(); setPublicDropdownOpen(false); }} className="px-5 py-3 text-left font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-danger)] hover:bg-[var(--clr-danger)] hover:text-white transition-colors">Depart Museum</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {mode === 'app' && (
          <div className="pointer-events-auto flex items-center gap-3">
            <Link to="/search">
              <motion.button whileHover={{ scale: 1.05 }} className="w-12 h-12 rounded-full bg-[rgba(20,18,17,0.6)] border border-[rgba(184,143,91,0.3)] backdrop-blur-md flex items-center justify-center text-[var(--clr-linen)] hover:text-[var(--clr-gold)] shadow-lg transition-colors">
                <MagnifyingGlass size={20} />
              </motion.button>
            </Link>
            <motion.button onClick={onOpenNotifs} whileHover={{ scale: 1.05 }} className="w-12 h-12 rounded-full bg-[rgba(20,18,17,0.6)] border border-[rgba(184,143,91,0.3)] backdrop-blur-md flex items-center justify-center text-[var(--clr-linen)] hover:text-[var(--clr-gold)] relative shadow-lg">
              <Bell size={20} />
              <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-[var(--clr-gold)] rounded-full" />
            </motion.button>
            <motion.button onClick={onOpenProfile} whileHover={{ scale: 1.05 }} className="w-12 h-12 rounded-full border border-[var(--clr-gold)] overflow-hidden shadow-lg">
              <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </motion.button>
          </div>
        )}
      </div>

      {mode === 'app' && (
        <div className="flex justify-start w-full mt-auto pointer-events-none">
          <div className="relative flex flex-col items-start gap-3 pointer-events-auto">
            <AnimatePresence>
              {isCompassHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute bottom-[calc(100%+16px)] left-0 flex flex-col gap-3"
                >
                  {WINGS.slice(0, 3).map((wing) => (
                    <Link
                      key={wing.path}
                      to={wing.path}
                      onMouseEnter={() => setHoveredWing(wing.path)}
                      onMouseLeave={() => setHoveredWing(null)}
                      onClick={(e) => e.stopPropagation()}
                      className="group/wing flex items-center bg-[rgba(20,18,17,0.85)] backdrop-blur-md h-14 rounded-full border border-[rgba(184,143,91,0.3)] hover:bg-[var(--clr-gold)] hover:border-[var(--clr-gold)] hover:text-[var(--clr-charcoal)] text-[var(--clr-linen)] transition-colors overflow-hidden shadow-lg"
                    >
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                        <wing.icon size={20} weight="fill" />
                      </div>
                      <div className={`transition-all duration-300 ease-[var(--ease-out)] overflow-hidden ${hoveredWing === wing.path ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        <span className="font-ui text-[10px] font-bold uppercase tracking-widest whitespace-nowrap pr-6 block">
                          {wing.label}
                        </span>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={onOpenWings}
              onMouseEnter={() => setIsCompassHovered(true)}
              onMouseLeave={() => setIsCompassHovered(false)}
              className="relative flex items-center bg-[rgba(20,18,17,0.92)] border border-[rgba(184,143,91,0.4)] backdrop-blur-xl rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden h-14 w-14 justify-center hover:border-[var(--clr-gold)] transition-colors z-10 cursor-pointer"
            >
              <div className="absolute inset-2 rounded-full bg-[var(--clr-gold)] shadow-[var(--shadow-gold)]" />
              <motion.div
                animate={{ rotate: isCompassHovered ? 90 : 0 }}
                className="relative z-10 text-[var(--clr-charcoal)]"
              >
                <Compass size={24} weight="fill" />
              </motion.div>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

function CinematicDirectory({ onClose }: { onClose: () => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 50, stiffness: 200 };
  const bgX = useTransform(useSpring(mouseX, springConfig), [0, 2000], ['-2%', '2%']);
  const bgY = useTransform(useSpring(mouseY, springConfig), [0, 1000], ['-2%', '2%']);

  const activeWing = hoveredIndex !== null ? WINGS[hoveredIndex] : WINGS[0];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-[var(--clr-charcoal)] text-[var(--clr-linen)] overflow-hidden flex"
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeWing.path}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            src={activeWing.bg}
            style={{ x: bgX, y: bgY }}
            className="absolute inset-0 w-full h-full object-cover sepia-[0.3]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--clr-charcoal)] via-[rgba(20,18,17,0.7)] to-transparent w-[60%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--clr-charcoal)] via-transparent to-transparent opacity-80" />
      </div>

      <div className="relative z-10 w-full flex flex-col md:flex-row h-full px-[clamp(24px,8vw,120px)] py-[clamp(40px,8vw,80px)] items-center">

        <button onClick={onClose} className="absolute top-10 right-10 w-16 h-16 rounded-full border border-[rgba(184,143,91,0.4)] text-[var(--clr-gold)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-black transition-all shadow-2xl z-50">
          <X size={28} weight="thin" />
        </button>

        <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
          <p className="font-script text-[48px] text-[var(--clr-gold)] leading-none mb-4 opacity-70 italic">"Chart your path"</p>
          <nav className="flex flex-col">
            {WINGS.map((wing, i) => (
              <Link
                key={wing.path} to={wing.path}
                onMouseEnter={() => setHoveredIndex(i)}
                className="group flex items-center gap-6 py-4 cursor-pointer relative"
              >
                <div className={`w-1 h-8 bg-[var(--clr-gold)] rounded-full transition-all duration-500 ${hoveredIndex === i ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`} />
                <span className={`font-display text-[2.5rem] md:text-[3.5rem] font-extrabold uppercase tracking-[0.1em] transition-all duration-500 ${hoveredIndex === i ? 'text-[var(--clr-gold-light)] translate-x-4' : 'text-[var(--clr-linen)] opacity-40 hover:opacity-70'}`}>
                  {wing.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex w-1/2 h-full items-center justify-end">
          <AnimatePresence mode="wait">
            <motion.div
              key={hoveredIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="max-w-[440px] text-right"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[rgba(184,143,91,0.1)] border border-[var(--clr-gold)] text-[var(--clr-gold)] mb-8 shadow-[var(--shadow-gold)]">
                 {activeWing && <activeWing.icon size={40} weight="fill" />}
              </div>
              <h3 className="font-display text-[2.5rem] font-bold text-[var(--clr-linen)] uppercase tracking-widest mb-4 leading-none">{activeWing.label}</h3>
              <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-[var(--clr-gold)] font-black mb-6 italic">{activeWing.hint}</p>
              <p className="font-ui text-[16px] text-[var(--clr-fog)] leading-[1.8] font-medium mb-10">
                {activeWing.desc}
              </p>
              <div className="flex justify-end gap-3 items-center text-[var(--clr-gold)] group cursor-pointer">
                 <span className="font-ui text-[11px] font-bold uppercase tracking-widest">Enter Wing</span>
                 <ArrowRight size={18} weight="bold" className="group-hover:translate-x-2 transition-transform" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function RegistryDrawer({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useLogs({ page, q: debouncedSearch });
  const logs = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 10) || 1;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 250 }} className="relative w-full max-w-[420px] h-full bg-[var(--clr-charcoal)] border-l border-[rgba(184,143,91,0.3)] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.8)]">

        <div className="p-8 border-b border-[rgba(184,143,91,0.15)] bg-gradient-to-b from-[rgba(184,143,91,0.05)] to-transparent">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 text-[var(--clr-gold)] mb-1">
                <Scroll size={18} weight="fill" />
                <span className="font-ui text-[9px] uppercase font-bold tracking-[0.2em]">The Archives</span>
              </div>
              <h2 className="font-display text-[1.75rem] text-[var(--clr-linen)] uppercase tracking-widest leading-none">Registry</h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-black transition-all cursor-pointer"><X size={18} /></button>
          </div>

          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search logs..."
              className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full pl-10 pr-4 py-2.5 font-ui text-[12px] text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-10"><Sparkle size={24} className="text-[var(--clr-gold)] animate-spin" /></div>
          ) : logs.length > 0 ? (
            logs.map((log: any, i: number) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={log.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(184,143,91,0.15)] rounded-2xl p-5 hover:border-[var(--clr-gold)] transition-all flex gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(20,18,17,0.8)] shrink-0 border border-[rgba(255,255,255,0.05)] shadow-inner text-[var(--clr-gold)]">
                  {log.action_type === 'security' ? <ShieldCheck size={18} weight="fill" /> : <Sparkle size={18} weight="fill" />}
                </div>
                <div>
                  <h4 className="font-display font-semibold text-[14px] text-[var(--clr-linen)] leading-tight mb-1">{log.user}</h4>
                  <p className="font-ui text-[12px] text-[var(--clr-fog)] leading-relaxed mb-2">{log.description}</p>
                  <p className="font-ui text-[9px] uppercase font-bold tracking-widest text-[var(--clr-gold-dark)]">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 opacity-50">
              <Scroll size={48} className="mx-auto mb-4 text-[var(--clr-gold)]" />
              <p className="font-ui text-[12px] text-[var(--clr-linen)]">No registry entries found.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[rgba(184,143,91,0.15)] flex justify-between items-center bg-[rgba(20,18,17,0.5)]">
           <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-full border border-[rgba(184,143,91,0.3)] flex items-center justify-center text-[var(--clr-gold)] hover:bg-[var(--clr-gold)] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
           >
              <CaretLeft size={14} weight="bold" />
           </button>
           <span className="font-ui text-[10px] font-bold tracking-widest text-[var(--clr-fog)] uppercase">
              Page {page} of {totalPages}
           </span>
           <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="w-8 h-8 rounded-full border border-[rgba(184,143,91,0.3)] flex items-center justify-center text-[var(--clr-gold)] hover:bg-[var(--clr-gold)] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
           >
              <CaretRight size={14} weight="bold" />
           </button>
        </div>

      </motion.div>
    </div>
  );
}

function IdentityDrawer({ onClose }: { onClose: () => void }) {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const displayName = currentUser?.fullName || 'Curator';
  const displayEmail = currentUser?.email || 'curator@legacykeeper.app';
  const avatarUrl = currentUser?.avatar || `https://ui-avatars.com/api/?name=${displayName.replace(/ /g, '+')}&background=B88F5B&color=fff&size=128`;
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 250 }} className="relative w-full max-w-[400px] h-full bg-[var(--clr-parchment)] border-l border-[var(--clr-aged)] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">

        <div className="p-8 border-b border-[var(--clr-aged)] flex justify-between items-start bg-[rgba(20,18,17,0.03)]">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-[3px] border-[var(--clr-gold)] shadow-lg overflow-hidden">
              <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--clr-gold)] text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-md whitespace-nowrap">
              {currentUser?.role || 'Curator'}
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => { logout(); onClose(); navigate({ to: '/auth' }); }} className="w-10 h-10 rounded-full border border-[var(--clr-danger)] text-[var(--clr-danger)] flex items-center justify-center hover:bg-[var(--clr-danger)] hover:text-white transition-all shadow-sm cursor-pointer" title="Depart Museum"><SignOut size={18} weight="bold" /></button>
             <button onClick={onClose} className="w-10 h-10 rounded-full border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-white transition-all bg-[var(--clr-paper)] shadow-sm cursor-pointer" title="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="p-10 pb-4">
          <h2 className="font-display font-bold text-[2rem] text-[var(--clr-ink)] uppercase tracking-wide mb-1 leading-none truncate w-full" title={displayName}>{displayName}</h2>
          <p className="font-ui text-[13px] text-[var(--clr-dust)] font-medium mb-10 truncate w-full" title={displayEmail}>{displayEmail}</p>

          <div className="space-y-3">
            {isAdmin && (
              <>
                <Link to="/settings" onClick={onClose} className="flex items-center gap-4 px-6 py-5 rounded-2xl border border-transparent hover:border-[var(--clr-gold)] hover:bg-white hover:shadow-md transition-all group">
                  <Gear size={22} className="text-[var(--clr-dust)] group-hover:text-[var(--clr-gold)]" /><span className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">Vault Settings</span>
                </Link>
                <Link to="/members" onClick={onClose} className="flex items-center gap-4 px-6 py-5 rounded-2xl border border-transparent hover:border-[var(--clr-gold)] hover:bg-white hover:shadow-md transition-all group">
                  <TreeStructure size={22} className="text-[var(--clr-dust)] group-hover:text-[var(--clr-gold)]" /><span className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">Manage Kinship</span>
                </Link>
                <Link to="/logs" onClick={onClose} className="flex items-center gap-4 px-6 py-5 rounded-2xl border border-transparent hover:border-[var(--clr-gold)] hover:bg-white hover:shadow-md transition-all group">
                  <Scroll size={22} className="text-[var(--clr-dust)] group-hover:text-[var(--clr-gold)]" /><span className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">Vault Registry</span>
                </Link>
              </>
            )}
            <Link to="/help" onClick={onClose} className="flex items-center gap-4 px-6 py-5 rounded-2xl border border-transparent hover:border-[var(--clr-gold)] hover:bg-white hover:shadow-md transition-all group">
              <Compass size={22} className="text-[var(--clr-dust)] group-hover:text-[var(--clr-gold)]" /><span className="font-ui text-[12px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">Museum Guidebook</span>
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

import { Scroll, User, CloudArrowUp, Trash, ShieldCheck, Key, DownloadSimple } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { sileo } from 'sileo';

const LOG_ENTRIES = [
  { id: 1, type: 'upload', icon: <CloudArrowUp />, user: 'Aisha K.', action: 'preserved "Wedding 1954"', time: '10 mins ago', color: 'var(--clr-info)' },
  { id: 2, type: 'security', icon: <ShieldCheck />, user: 'System', action: 'Face clustering complete (12 new profiles)', time: '2 hours ago', color: 'var(--clr-success)' },
  { id: 3, type: 'auth', icon: <Key />, user: 'Abebe K.', action: 'Signed in from new device', time: '5 hours ago', color: 'var(--clr-warning)' },
  { id: 4, type: 'delete', icon: <Trash />, user: 'Aisha K.', action: 'Purged 3 redundant photo bursts', time: 'Yesterday', color: 'var(--clr-danger)' },
];

export default function Logs() {
  const handleDownloadRegistry = () => {
     const p = new Promise(res => setTimeout(res, 1500));
     sileo.promise(p, {
       loading: { title: "Compiling..." },
       success: { title: "Download Ready", description: "legacy-keeper-logs.csv saved." },
       error: { title: "Error", description: "Failed to compile registry." },
     });
  };
  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-16">
          <div className="flex items-center gap-3 text-[var(--clr-gold)] mb-2 font-display uppercase tracking-[0.2em] text-sm">
            <Scroll size={24} weight="fill" /> Vault Registry
          </div>
          <h1 className="font-display text-[2.5rem] text-[var(--clr-ink)] leading-tight uppercase">Chronicle of Actions</h1>
          <p className="font-script text-[40px] text-[var(--clr-dust)] leading-[0.5] mt-2">"Every step, recorded"</p>
        </header>

        {/* The Registry Ribbon */}
        <div className="relative pl-8 border-l-2 border-[var(--clr-aged)] space-y-8">
          {LOG_ENTRIES.map((log, i) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={log.id}
              onClick={() => sileo.info({ title: `Registry ID: LK-00${log.id}`, description: `Detailed action log for ${log.user}` })}
              className="relative bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-2xl p-5 shadow-sm flex items-center gap-6 group hover:border-[var(--clr-gold)] transition-colors cursor-pointer"
            >
              {/* Timeline Connector Dot */}
              <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--clr-parchment)] border-4 border-[var(--clr-aged)] z-10 group-hover:border-[var(--clr-gold)] transition-colors" />

              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: log.color }}>
                {log.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-display font-bold text-[15px] text-[var(--clr-ink)] flex items-center gap-2">
                    <User size={14} className="opacity-50" /> {log.user}
                  </span>
                  <span className="font-ui text-[10px] text-[var(--clr-fog)] font-bold uppercase tracking-widest">{log.time}</span>
                </div>
                <p className="font-ui text-[14px] text-[var(--clr-dust)] truncate">{log.action}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--clr-aged)] text-center">
           <button
             onClick={handleDownloadRegistry}
             className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-gold)] hover:bg-[var(--clr-gold-muted)] px-8 py-4 rounded-full transition-colors border border-[var(--clr-gold)] flex items-center gap-2 mx-auto"
           >
             <DownloadSimple size={18} /> DOWNLOAD FULL REGISTRY (.CSV)
           </button>
        </div>
      </div>
    </div>
  );
}
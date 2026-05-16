import { Scroll, User, CloudArrowUp, Trash, ShieldCheck, Key, DownloadSimple } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { sileo } from 'sileo';
import { useLogs, useGovernanceActions } from '../features/governance/hooks/useGovernance';
import { pollTask } from '../lib/tasks';

export default function Logs() {
  const { data: logs = [] } = useLogs();
  const { exportLogs } = useGovernanceActions();

  const getIcon = (type: string) => {
    switch(type) {
      case 'upload': return { icon: <CloudArrowUp />, color: 'var(--clr-info)' };
      case 'security': return { icon: <ShieldCheck />, color: 'var(--clr-success)' };
      case 'delete': return { icon: <Trash />, color: 'var(--clr-danger)' };
      default: return { icon: <Key />, color: 'var(--clr-warning)' };
    }
  };

  const handleDownloadRegistry = async () => {
    const { task_id } = await exportLogs.mutateAsync();
    sileo.promise(pollTask(task_id), {
      loading: { title: "Compiling..." },
      success: { title: "Download Ready", description: "Your logs CSV has been emailed." },
      error: { title: "Error", description: "Failed to compile registry." },
    });
  };

  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-16">
          <div className="flex items-center gap-3 text-[var(--clr-gold)] mb-2 font-display uppercase tracking-[0.2em] text-sm"><Scroll size={24} weight="fill" /> Vault Registry</div>
          <h1 className="font-display text-[2.5rem] text-[var(--clr-ink)] leading-tight uppercase">Chronicle of Actions</h1>
        </header>

        <div className="relative pl-8 border-l-2 border-[var(--clr-aged)] space-y-8">
          {logs.map((log: any, i: number) => {
            const style = getIcon(log.action_type);
            return (
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={log.id} className="relative bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-2xl p-5 shadow-sm flex items-center gap-6 group hover:border-[var(--clr-gold)]">
                <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--clr-parchment)] border-4 border-[var(--clr-aged)] z-10 group-hover:border-[var(--clr-gold)]" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: style.color }}>{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display font-bold text-[15px] text-[var(--clr-ink)] flex items-center gap-2"><User size={14} className="opacity-50" /> {log.user}</span>
                    <span className="font-ui text-[10px] text-[var(--clr-fog)] font-bold uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-ui text-[14px] text-[var(--clr-dust)] truncate">{log.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--clr-aged)] text-center">
           <button onClick={handleDownloadRegistry} className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-gold)] hover:bg-[var(--clr-gold-muted)] px-8 py-4 rounded-full transition-colors border border-[var(--clr-gold)] flex items-center gap-2 mx-auto">
             <DownloadSimple size={18} /> DOWNLOAD FULL REGISTRY (.CSV)
           </button>
        </div>
      </div>
    </div>
  );
}
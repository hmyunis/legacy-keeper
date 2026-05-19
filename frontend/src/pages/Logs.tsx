import { useState } from 'react';
import { Scroll, User, CloudArrowUp, Trash, ShieldCheck, Key, DownloadSimple, ArrowRight, MagnifyingGlass, CaretLeft, CaretRight, Sparkle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { useAuthStore } from '../stores/authStore';
import { useLogs } from '../features/governance/hooks/useGovernance';
import axiosClient from '../services/axiosClient';
import { useDebouncedValue } from '../lib/debounce';

export default function Logs() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const activeVaultId = useAuthStore(s => s.activeVaultId);
  const { data, isLoading } = useLogs({ page, q: debouncedSearch });

  const logs = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 10) || 1;

  const getIcon = (type: string) => {
    switch(type) {
      case 'upload': return { icon: <CloudArrowUp />, color: 'var(--clr-info)' };
      case 'security': return { icon: <ShieldCheck />, color: 'var(--clr-success)' };
      case 'delete': return { icon: <Trash />, color: 'var(--clr-danger)' };
      default: return { icon: <Key />, color: 'var(--clr-warning)' };
    }
  };

  const handleDownloadRegistry = async () => {
    setIsDownloading(true);
    await sileo.promise(
      axiosClient.get(`/vaults/${activeVaultId}/logs/download/`, { responseType: 'blob' }),
      {
        loading: { title: "Compiling Registry..." },
        success: (response) => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `vault_registry_${activeVaultId}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          return { title: "Download Ready", description: "Your registry CSV has been downloaded." };
        },
        error: { title: "Download Failed" }
      }
    ).finally(() => setIsDownloading(false));
  };

  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 text-[var(--clr-gold)] mb-2 font-display uppercase tracking-[0.2em] text-sm"><Scroll size={24} weight="fill" /> Vault Registry</div>
            <h1 className="font-display text-[2.5rem] text-[var(--clr-ink)] leading-tight uppercase">Chronicle of Actions</h1>
          </div>

          <div className="relative w-full md:w-[300px]">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search actions or users..."
              className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full pl-12 pr-4 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] transition-colors shadow-inner"
            />
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><Sparkle size={32} className="text-[var(--clr-gold)] animate-spin" /></div>
        ) : logs.length > 0 ? (
          <>
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
                      {log.target_id && (
                        <div className="mt-2">
                          {log.target_type === 'PERSON' ? (
                            <Link
                              to="/person/$personId"
                              params={{ personId: log.target_id }}
                              className="text-[10px] font-bold text-[var(--clr-gold)] hover:underline flex items-center gap-1"
                            >
                              VIEW ITEM <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <Link
                              to="/vault"
                              className="text-[10px] font-bold text-[var(--clr-gold)] hover:underline flex items-center gap-1"
                            >
                              VIEW ITEM <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-center items-center gap-6">
               <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-10 h-10 rounded-full border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:bg-[var(--clr-gold)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                  <CaretLeft size={16} weight="bold" />
               </button>
               <span className="font-ui text-[12px] font-bold tracking-widest text-[var(--clr-dust)] uppercase">
                  Page {page} of {totalPages}
               </span>
               <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="w-10 h-10 rounded-full border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:bg-[var(--clr-gold)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                  <CaretRight size={16} weight="bold" />
               </button>
            </div>
          </>
        ) : (
           <div className="text-center py-20 opacity-50 bg-[var(--clr-paper)] rounded-3xl border border-dashed border-[var(--clr-aged)]">
             <Scroll size={48} className="mx-auto mb-4 text-[var(--clr-gold)]" />
             <p className="font-ui text-[14px] text-[var(--clr-ink)]">No registry entries found.</p>
           </div>
        )}

        <div className="mt-16 pt-8 border-t border-[var(--clr-aged)] text-center">
           <button onClick={handleDownloadRegistry} disabled={isDownloading} className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-gold)] hover:bg-[var(--clr-gold-muted)] px-8 py-4 rounded-full transition-colors border border-[var(--clr-gold)] flex items-center gap-2 mx-auto disabled:opacity-50 cursor-pointer">
             <DownloadSimple size={18} /> {isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD FULL REGISTRY (.CSV)'}
           </button>
        </div>
      </div>
    </div>
  );
}
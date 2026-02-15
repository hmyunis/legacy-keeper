import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, ColumnDef, SortingState } from '@tanstack/react-table';
import { ArrowUpDown, Search, Filter, RefreshCw, Download, Calendar, User, ChevronLeft, ChevronRight, ChevronDown, History, Terminal, Check } from 'lucide-react';
import { AuditLog } from '../types';
import { toast } from 'sonner';
import AuditTable from '../components/audit-logs/AuditTable';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useTranslation } from '../i18n/LanguageContext';
import { InfiniteScroll } from '../components/ui/Pagination';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { auditApi } from '../services/auditApi';
import { getApiErrorMessage } from '../services/httpError';

const LOG_CATEGORIES = ['All', 'Uploads', 'Access', 'System', 'Management'] as const;
const LOG_TIMEFRAMES = ['ALL', 'DAY', 'WEEK', 'MONTH'] as const;

const AuditLogs: React.FC = () => {
  const { t } = useTranslation();
  const { activeVaultId } = useAuthStore();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { category?: string; timeframe?: string };
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeCategory = LOG_CATEGORIES.includes(searchParams.category as any) ? (searchParams.category as string) : 'All';
  const activeTimeframe: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' = LOG_TIMEFRAMES.includes(searchParams.timeframe as any)
    ? (searchParams.timeframe as 'ALL' | 'DAY' | 'WEEK' | 'MONTH')
    : 'ALL';

  const setActiveCategory = (category: string) => {
    navigate({
      to: '/logs',
      search: (prev: Record<string, unknown>) => ({ ...prev, category }),
    } as any);
  };

  const setActiveTimeframe = (timeframe: 'ALL' | 'DAY' | 'WEEK' | 'MONTH') => {
    navigate({
      to: '/logs',
      search: (prev: Record<string, unknown>) => ({ ...prev, timeframe }),
    } as any);
  };

  useEffect(() => {
    if (searchParams.category && searchParams.timeframe) return;
    navigate({
      to: '/logs',
      replace: true,
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        category: activeCategory,
        timeframe: activeTimeframe,
      }),
    } as any);
  }, [activeCategory, activeTimeframe, navigate, searchParams.category, searchParams.timeframe]);

  const { 
    data: logsData, 
    isLoading, 
    isRefetching, 
    refetch, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useAuditLogs({
    category: activeCategory as 'All' | 'Uploads' | 'Access' | 'System' | 'Management',
    timeframe: activeTimeframe,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    const click = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false); };
    document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const allLogs = useMemo(() => {
    if (!logsData) return [];
    return logsData.pages.flatMap(page => page.items);
  }, [logsData]);

  const columns = useMemo<ColumnDef<AuditLog>[]>(() => [
    { accessorKey: 'timestamp', header: ({ column }) => (<button className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t.auditLogs.table.timestamp} <ArrowUpDown size={12} /></button>), cell: info => (<div className="flex flex-col gap-0.5"><div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-xs"><Calendar size={14} className="text-primary" />{info.getValue() as string}</div></div>) },
    { accessorKey: 'actorName', header: ({ column }) => (<button className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t.auditLogs.table.actor} <ArrowUpDown size={12} /></button>), cell: info => (<div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${info.getValue() === 'System' ? 'bg-slate-900 text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>{info.getValue() === 'System' ? <Terminal size={14} /> : <User size={14} />}</div><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{info.getValue() as string}</span></div>) },
    { accessorKey: 'action', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.action}</span>, cell: info => <span className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{(info.getValue() as string).replace('_', ' ')}</span> },
    { accessorKey: 'target', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.resource}</span>, cell: info => <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px] inline-block">{info.getValue() as string}</span> },
    { accessorKey: 'details', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.details}</span>, cell: info => <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed line-clamp-1">{info.getValue() as string}</p> }
  ], [t]);

  const table = useReactTable({ 
    data: allLogs, 
    columns, 
    state: { sorting }, 
    onSortingChange: setSorting, 
    getCoreRowModel: getCoreRowModel(), 
    getSortedRowModel: getSortedRowModel(), 
    getPaginationRowModel: getPaginationRowModel(), 
    initialState: { pagination: { pageSize: 10 } } 
  });

  const handleRefresh = async () => {
    const promise = refetch();
    toast.promise(promise, {
      loading: t.auditLogs.toasts.syncing,
      success: t.auditLogs.toasts.synced,
      error: t.auditLogs.toasts.failed,
    });
  };

  const handleDownload = async () => {
    if (!activeVaultId) {
      toast.error('No active vault selected');
      return;
    }

    setIsDownloading(true);
    try {
      const downloadPromise = auditApi.exportAuditLogs(activeVaultId, {
        category: activeCategory as 'All' | 'Uploads' | 'Access' | 'System' | 'Management',
        timeframe: activeTimeframe,
        search: debouncedSearch || undefined,
      });

      toast.promise(downloadPromise, {
        loading: t.auditLogs.toasts.syncing,
        success: t.auditLogs.toasts.exported,
        error: t.auditLogs.toasts.failed,
      });

      const { blob, fileName } = await downloadPromise;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(t.auditLogs.toasts.failed, {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const categories = [
    { id: 'All', label: t.auditLogs.categories.all },
    { id: 'Uploads', label: t.auditLogs.categories.uploads },
    { id: 'Access', label: t.auditLogs.categories.access },
    { id: 'System', label: t.auditLogs.categories.system },
    { id: 'Management', label: t.auditLogs.categories.management },
  ];

  const timeframeOptions = [
    { id: 'ALL' as const, label: t.auditLogs.timeframeOptions.all },
    { id: 'DAY' as const, label: t.auditLogs.timeframeOptions.day },
    { id: 'WEEK' as const, label: t.auditLogs.timeframeOptions.week },
    { id: 'MONTH' as const, label: t.auditLogs.timeframeOptions.month },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight flex items-center gap-3"><History className="text-primary" size={24} />{t.auditLogs.title}</h1><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.auditLogs.subtitle}</p></div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={isRefetching} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:text-primary transition-all active:scale-95"><RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} /></button>
          <button onClick={handleDownload} disabled={isDownloading} className="px-6 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"><Download size={16} />{t.auditLogs.actions.download}</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card transition-all">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row gap-6 justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative w-full xl:w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchInput} 
              onChange={e => setSearchInput(e.target.value)} 
              placeholder={t.auditLogs.searchPlaceholder} 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all dark:text-slate-200" 
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full xl:w-auto">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.id)} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${activeCategory === cat.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-primary hover:border-primary/50'}`}
              >
                {cat.label}
              </button>
            ))}
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${activeTimeframe !== 'ALL' ? 'border-primary text-primary bg-primary/5' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Filter size={14} />
                {timeframeOptions.find(o => o.id === activeTimeframe)?.label}
                <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 animate-in slide-in-from-top-2">
                  {timeframeOptions.map(opt => (
                    <button 
                      key={opt.id} 
                      onClick={() => { setActiveTimeframe(opt.id); setIsFilterOpen(false); }} 
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${activeTimeframe === opt.id ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      {opt.label}
                      {activeTimeframe === opt.id && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="relative">
          {isRefetching && (
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-2xl">
                <RefreshCw className="animate-spin text-primary" size={24} />
              </div>
            </div>
          )}
          <InfiniteScroll
            hasNextPage={hasNextPage || false}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          >
            <AuditTable table={table} isLoading={isLoading} columnsCount={columns.length} />
          </InfiniteScroll>
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{t.auditLogs.pagination.show}</span>
             <select 
               value={table.getState().pagination.pageSize} 
               onChange={e => table.setPageSize(Number(e.target.value))}
               className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm dark:text-slate-200"
             >
               {[10, 20, 50].map(s => (
                 <option key={s} value={s}>{s}</option>
               ))}
             </select>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl disabled:opacity-30 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"><ChevronLeft size={16} className="dark:text-slate-300" /></button>
             <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl disabled:opacity-30 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"><ChevronRight size={16} className="dark:text-slate-300" /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;

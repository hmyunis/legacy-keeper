import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, SortingState } from '@tanstack/react-table';
import { ArrowUpDown, Search, Filter, RefreshCw, Download, Calendar, User, ChevronLeft, ChevronRight, ChevronDown, History, Terminal, Check } from 'lucide-react';
import { AuditLog } from '../types';
import { toast } from 'sonner';
import AuditTable from '../components/audit-logs/AuditTable';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useTranslation } from '../i18n/LanguageContext';
import { subHours, subDays, isAfter, parse } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

type Timeframe = 'ALL' | 'DAY' | 'WEEK' | 'MONTH';

const AuditLogs: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, isRefetching, refetch } = useAuditLogs();

  useEffect(() => {
    const click = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false); };
    document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click);
  }, []);

  const filteredData = useMemo(() => {
    if (!logs) return [];
    
    // Category Filter
    let result = logs;
    if (activeCategory !== 'All') {
      result = result.filter(l => {
        if (activeCategory === 'Uploads') return l.action === 'UPLOAD';
        if (activeCategory === 'Access') return l.action.includes('INVITE') || l.action.includes('LOGIN');
        if (activeCategory === 'System') return l.actorName === 'System' || l.action === 'FACE_DETECT';
        if (activeCategory === 'Management') return l.action.includes('DELETE') || l.action.includes('EDIT');
        return true;
      });
    }

    // Timeframe Filter
    if (activeTimeframe !== 'ALL') {
      const now = new Date();
      let threshold: Date;
      
      switch (activeTimeframe) {
        case 'DAY': threshold = subHours(now, 24); break;
        case 'WEEK': threshold = subDays(now, 7); break;
        case 'MONTH': threshold = subDays(now, 30); break;
        default: threshold = new Date(0);
      }

      result = result.filter(l => {
        // Our mock dates are in 'yyyy-MM-dd HH:mm' format
        try {
          const logDate = parse(l.timestamp, 'yyyy-MM-dd HH:mm', new Date());
          return isAfter(logDate, threshold);
        } catch (e) {
          return true;
        }
      });
    }

    return result;
  }, [logs, activeCategory, activeTimeframe]);

  const columns = useMemo<ColumnDef<AuditLog>[]>(() => [
    { accessorKey: 'timestamp', header: ({ column }) => (<button className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t.auditLogs.table.timestamp} <ArrowUpDown size={12} /></button>), cell: info => (<div className="flex flex-col gap-0.5"><div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-xs"><Calendar size={14} className="text-primary" />{info.getValue() as string}</div></div>) },
    { accessorKey: 'actorName', header: ({ column }) => (<button className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t.auditLogs.table.actor} <ArrowUpDown size={12} /></button>), cell: info => (<div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${info.getValue() === 'System' ? 'bg-slate-900 text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>{info.getValue() === 'System' ? <Terminal size={14} /> : <User size={14} />}</div><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{info.getValue() as string}</span></div>) },
    { accessorKey: 'action', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.action}</span>, cell: info => <span className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{(info.getValue() as string).replace('_', ' ')}</span> },
    { accessorKey: 'target', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.resource}</span>, cell: info => <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px] inline-block">{info.getValue() as string}</span> },
    { accessorKey: 'details', header: () => <span className="uppercase font-bold tracking-widest text-[10px]">{t.auditLogs.table.details}</span>, cell: info => <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed line-clamp-1">{info.getValue() as string}</p> }
  ], [t]);

  const table = useReactTable({ data: filteredData, columns, state: { sorting, globalFilter }, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } });

  const handleRefresh = async () => {
    const promise = refetch();
    toast.promise(promise, {
      loading: t.auditLogs.toasts.syncing,
      // Fixed: Property access should be t.auditLogs.toasts.synced
      success: t.auditLogs.toasts.synced,
      error: t.auditLogs.toasts.failed,
    });
  };

  const categories = [
    { id: 'All', label: t.auditLogs.categories.all },
    { id: 'Uploads', label: t.auditLogs.categories.uploads },
    { id: 'Access', label: t.auditLogs.categories.access },
    { id: 'System', label: t.auditLogs.categories.system },
    { id: 'Management', label: t.auditLogs.categories.management },
  ];

  const timeframeOptions: { id: Timeframe; label: string }[] = [
    { id: 'ALL', label: t.auditLogs.timeframeOptions.all },
    { id: 'DAY', label: t.auditLogs.timeframeOptions.day },
    { id: 'WEEK', label: t.auditLogs.timeframeOptions.week },
    { id: 'MONTH', label: t.auditLogs.timeframeOptions.month },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight flex items-center gap-3"><History className="text-primary" size={24} />{t.auditLogs.title}</h1><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.auditLogs.subtitle}</p></div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={isRefetching} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:text-primary transition-all active:scale-95"><RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} /></button>
          <button onClick={() => toast.success(t.auditLogs.toasts.exported)} className="px-6 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"><Download size={16} />{t.auditLogs.actions.download}</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card transition-all">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row gap-6 justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative w-full xl:w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={globalFilter ?? ''} 
              onChange={e => setGlobalFilter(e.target.value)} 
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
          <AuditTable table={table} isLoading={isLoading} columnsCount={columns.length} />
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{t.auditLogs.pagination.show}</span>
             <Select 
               value={table.getState().pagination.pageSize.toString()} 
               onValueChange={v => table.setPageSize(Number(v))}
             >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map(s => (
                    <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
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
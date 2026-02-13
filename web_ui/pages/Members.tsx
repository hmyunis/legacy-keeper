import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Search, Shield, Trash2, Clock, UserCheck } from 'lucide-react';
import { FamilyMember, UserRole, MemberStatus } from '../types';
import InviteModal from '../components/members/InviteModal';
import { CardSkeleton, Skeleton } from '../components/Skeleton';
import { useMembers, useInviteMember, useRemoveMember } from '../hooks/useMembers';
import { useTranslation } from '../i18n/LanguageContext';

const Members: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [inviteState, setInviteState] = useState({ open: false, email: '', role: UserRole.VIEWER });

  const { data: members, isLoading } = useMembers();
  const inviteMutation = useInviteMember();
  const removeMutation = useRemoveMember();

  const filtered = useMemo(() => { 
    if (!members) return []; 
    return members.filter(m => { 
      const matchesS = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      m.email.toLowerCase().includes(searchQuery.toLowerCase()); 
      const matchesR = roleFilter === 'ALL' || m.role === roleFilter; 
      return matchesS && matchesR; 
    }); 
  }, [members, searchQuery, roleFilter]);

  const stats = useMemo(() => { 
    if (!members) return { total: 0, active: 0, pending: 0, admins: 0 }; 
    return { 
      total: members.length, 
      active: members.filter(m => m.status === MemberStatus.ACTIVE).length, 
      pending: members.filter(m => m.status === MemberStatus.PENDING).length, 
      admins: members.filter(m => m.role === UserRole.ADMIN).length 
    }; 
  }, [members]);

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.ADMIN) return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30';
    if (role === UserRole.CONTRIBUTOR) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ 
      email: inviteState.email, 
      role: inviteState.role 
    }, {
      onSuccess: () => setInviteState(s => ({ ...s, open: false, email: '' }))
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{t.members.title}</h1><p className="text-slate-500 dark:text-slate-400 text-sm">{t.members.subtitle}</p></div>
        <button onClick={() => setInviteState(s => ({ ...s, open: true }))} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 glow-primary active:scale-95 shadow-lg shadow-primary/20"><UserPlus size={18} />{t.members.invite}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading 
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : [
            { label: t.members.stats.total, value: stats.total, icon: <Users className="text-primary" />, color: 'bg-primary/10' },
            { label: t.members.stats.active, value: stats.active, icon: <UserCheck className="text-emerald-600 dark:text-emerald-400" />, color: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: t.members.stats.pending, value: stats.pending, icon: <Clock className="text-orange-600 dark:text-orange-400" />, color: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t.members.stats.admins, value: stats.admins, icon: <Shield className="text-purple-600 dark:text-purple-400" />, color: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 glow-card">
              <div className={`p-3 rounded-2xl ${s.color}`}>{(s.icon as any)}</div>
              <div><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p></div>
            </div>
          ))
        }
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.members.searchPlaceholder} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200" 
            />
          </div>
          <div className="flex gap-2">
            <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {(['ALL', UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] as const).map((r) => (
                <button 
                  key={r} 
                  onClick={() => setRoleFilter(r)} 
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${roleFilter === r ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-slate-50/30 dark:bg-slate-950/20">
                <th className="px-8 py-4">{t.members.table.identity}</th>
                <th className="px-8 py-4">{t.members.table.clearance}</th>
                <th className="px-8 py-4">{t.members.table.status}</th>
                <th className="px-8 py-4">{t.members.table.date}</th>
                <th className="px-8 py-4 text-right">{t.members.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-8 py-5"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-6 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.map((m) => (
                <tr key={m.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <img src={m.profilePhoto} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" alt="" />
                      <div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.fullName}</p><p className="text-[11px] text-slate-400 dark:text-slate-500">{m.email}</p></div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg border uppercase ${getRoleBadge(m.role)}`}>{m.role}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${m.status === MemberStatus.ACTIVE ? 'bg-emerald-500' : 'bg-orange-400'}`}></div>
                      <span className={`text-[10px] font-bold uppercase ${m.status === MemberStatus.ACTIVE ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>{m.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5"><span className="text-xs text-slate-500 dark:text-slate-400">{m.joinedDate}</span></td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all" onClick={() => removeMutation.mutate(m.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 uppercase text-[10px] font-bold tracking-widest">No matching members found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {inviteState.open && (
        <InviteModal 
          email={inviteState.email} 
          role={inviteState.role} 
          isPending={inviteMutation.isPending} 
          onEmailChange={e => setInviteState(s => ({ ...s, email: e }))} 
          onRoleChange={r => setInviteState(s => ({ ...s, role: r }))} 
          onClose={() => setInviteState(s => ({ ...s, open: false }))} 
          onSubmit={handleInviteSubmit} 
        />
      )}
    </div>
  );
};

export default Members;
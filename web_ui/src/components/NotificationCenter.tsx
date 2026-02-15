
import React from 'react';
import { 
  Database, 
  MessageSquare, 
  ShieldAlert, 
  GitBranch, 
  Terminal, 
  X, 
  CheckCircle2, 
  Clock,
  Trash2,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { InAppNotification, InAppNotificationType } from '../types';

const typeConfig: Record<InAppNotificationType, { icon: React.ReactNode, color: string }> = {
  upload: { icon: <Database size={14} />, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
  comment: { icon: <MessageSquare size={14} />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  security: { icon: <ShieldAlert size={14} />, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' },
  tree: { icon: <GitBranch size={14} />, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
  member: { icon: <Users size={14} />, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
  system: { icon: <Terminal size={14} />, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const toRelativeTime = (value: string | null | undefined): string => {
  if (!value) return 'just now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'just now';
  return formatDistanceToNow(parsed, { addSuffix: true });
};

interface NotificationCenterProps {
  onClose: () => void;
  notifications: InAppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
}) => {

  return (
    <div className="absolute top-full right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl z-[100] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Archival Activity</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">
            {unreadCount} Unread Alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={onMarkAllAsRead}
              className="p-2 text-slate-400 hover:text-primary transition-colors"
              title="Mark all as read"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] no-scrollbar">
        {notifications.length > 0 ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-5 flex gap-4 transition-colors group relative ${!n.isRead ? 'bg-primary/[0.02] dark:bg-primary/[0.01]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                onClick={() => !n.isRead && onMarkAsRead(n.id)}
              >
                <div className={`p-2.5 rounded-xl shrink-0 h-fit ${typeConfig[n.type].color}`}>
                  {typeConfig[n.type].icon}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-xs font-bold leading-tight ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {n.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    <Clock size={10} />
                    {toRelativeTime(n.createdAt)}
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                  className="absolute top-5 right-5 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
                {!n.isRead && (
                  <div className="absolute top-6 right-2 w-1.5 h-1.5 bg-primary rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center px-8">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-200 dark:text-slate-700 mb-4">
              <Database size={32} />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Vault is Quiet</p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">No new notifications from the family circle today.</p>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onClearAll}
            className="w-full py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors"
          >
            Purge History
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

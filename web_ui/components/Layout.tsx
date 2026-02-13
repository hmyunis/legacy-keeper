
import React, { useState, useRef, useEffect } from 'react';
import { NAVIGATION } from '../constants';
import { Bell, Menu, Sun, Moon, LogOut, X, Languages, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useTranslation } from '../i18n/LanguageContext';
import { Link } from '@tanstack/react-router';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  theme, 
  onToggleTheme
}) => {
  const { t, locale, setLocale } = useTranslation();
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    isMobileMenuOpen, 
    toggleMobileMenu, 
    setMobileMenuOpen
  } = useUIStore();
  const { currentUser, logout } = useAuthStore();
  const { notifications } = useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
      if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const filteredNavigation = NAVIGATION.filter(item => item.roles.includes(currentUser.role));

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className="p-6 flex items-center justify-between gap-3">
        <Link to="/" onClick={() => isMobile && setMobileMenuOpen(false)} className={`flex items-center gap-3 group/logo transition-all hover:opacity-80 ${(!isSidebarOpen && !isMobile) ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 shrink-0">L</div>
          {(isSidebarOpen || isMobile) && <span className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight truncate">LegacyKeeper</span>}
        </Link>
        {isMobile && <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>}
      </div>
      <nav className="flex-1 mt-4 px-3 space-y-2 no-scrollbar overflow-y-auto">
        {filteredNavigation.map((item) => {
          const to = item.href.replace('#', '');
          const translatedName = (t.common.navigation as any)[item.name.toLowerCase().replace(/\s+/g, '')] || item.name;
          return (
            <Link key={item.name} to={to as any} onClick={() => isMobile && setMobileMenuOpen(false)} activeProps={{ className: 'text-primary dark:text-primary bg-primary/5 font-bold shadow-sm' }} className={`flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 ${(!isSidebarOpen && !isMobile) ? 'justify-center px-0' : ''}`}>
              <span className={`shrink-0 ${activeTab === item.name ? 'text-primary' : 'text-slate-400'}`}>{item.icon}</span>
              {(isSidebarOpen || isMobile) && <span className="text-sm whitespace-nowrap">{translatedName}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-50 dark:border-slate-800/50 mt-auto">
        <div className="flex flex-col gap-2">
          <div className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all ${(!isSidebarOpen && !isMobile) ? 'justify-center px-0 bg-transparent border-none shadow-none' : ''}`}>
            <img src={currentUser.profilePhoto} className="w-9 h-9 rounded-full object-cover border border-white dark:border-slate-700 shadow-sm shrink-0" alt="" />
            {(isSidebarOpen || isMobile) && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.fullName}</p>
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-lg border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wider">{currentUser.role}</span>
              </div>
            )}
          </div>
          <button onClick={logout} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 group ${(!isSidebarOpen && !isMobile) ? 'justify-center px-0' : ''}`}><LogOut size={20} className="shrink-0" />{(isSidebarOpen || isMobile) && <span className="text-sm font-bold uppercase tracking-widest text-[10px]">{t.common.navigation.logout}</span>}</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 overflow-hidden relative">
      <aside className={`hidden lg:flex flex-col h-full bg-white dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-800/60 transition-all duration-500 backdrop-blur-xl z-30 relative ${isSidebarOpen ? 'w-64' : 'w-20'}`}><SidebarContent /><button onClick={toggleSidebar} className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-primary shadow-lg z-40 transition-transform active:scale-90">{isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}</button></aside>
      {isMobileMenuOpen && <div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[40] transition-opacity animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`lg:hidden fixed top-0 bottom-0 left-0 w-[280px] bg-white dark:bg-slate-900 z-[50] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><SidebarContent isMobile={true} /></aside>
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => window.innerWidth < 1024 ? toggleMobileMenu() : toggleSidebar()} className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Menu size={20} /></button>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative" ref={langRef}><button onClick={() => setIsLangOpen(!isLangOpen)} className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 ${isLangOpen ? 'bg-primary text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Languages size={20} /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{locale === 'en' ? 'EN' : 'AM'}</span></button>{isLangOpen && <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2"><button onClick={() => { setLocale('en'); setIsLangOpen(false); }} className={`w-full px-4 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${locale === 'en' ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>English</button><button onClick={() => { setLocale('am'); setIsLangOpen(false); }} className={`w-full px-4 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${locale === 'am' ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>አማርኛ</button></div>}</div>
            <button onClick={onToggleTheme} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-yellow-400" />}</button>
            <div className="relative" ref={notifRef}><button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2.5 rounded-xl transition-all duration-300 ${isNotifOpen ? 'bg-primary text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Bell size={20} />{unreadCount > 0 && <span className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black ${isNotifOpen ? 'bg-white text-primary' : 'bg-rose-500 text-white'}`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>{isNotifOpen && <NotificationCenter onClose={() => setIsNotifOpen(false)} />}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 dark:bg-slate-950/50 scroll-smooth">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

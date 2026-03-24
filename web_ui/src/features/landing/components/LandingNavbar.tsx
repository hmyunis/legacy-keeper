import type { FC } from 'react';
import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { getDisplayFirstName } from '@/features/landing/selectors';
import type { User } from '@/types';

interface LandingNavbarProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
  onDashboard: () => void;
  onLogout: () => void;
}

export const LandingNavbar: FC<LandingNavbarProps> = ({
  isAuthenticated,
  currentUser,
  isDropdownOpen,
  onToggleDropdown,
  onCloseDropdown,
  onDashboard,
  onLogout,
}) => (
  <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <Link
        to="/"
        className="flex items-center gap-2 sm:gap-3 shrink-0 group/logo transition-opacity hover:opacity-80"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 text-sm sm:text-base">L</div>
        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-xl tracking-tight xs:block">LegacyKeeper</span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-6">
        {isAuthenticated && currentUser ? (
          <div className="relative">
            <button
              onClick={onToggleDropdown}
              className="flex items-center gap-2 sm:gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <img
                src={currentUser.profilePhoto}
                alt={currentUser.fullName}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200">
                {getDisplayFirstName(currentUser.fullName)}
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            <DropdownMenu
              isOpen={isDropdownOpen}
              onClose={onCloseDropdown}
              align="right"
            >
              <DropdownMenuItem
                onClick={onDashboard}
                icon={<LayoutDashboard size={16} />}
              >
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                variant="danger"
                icon={<LogOut size={16} />}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        ) : (
          <>
            <Link to="/login" className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors uppercase tracking-widest px-2 sm:px-3 py-2">Sign In</Link>
            <Link to="/signup" className="bg-primary text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs hover:opacity-90 transition-all shadow-lg shadow-primary/20 glow-primary uppercase tracking-widest whitespace-nowrap">Open Vault</Link>
          </>
        )}
      </div>
    </div>
  </nav>
);

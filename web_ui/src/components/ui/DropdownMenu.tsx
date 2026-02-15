import React, { useRef, useEffect } from 'react';

interface DropdownMenuProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  children, 
  isOpen, 
  onClose, 
  align = 'right' 
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={ref}
      className={`absolute top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {children}
    </div>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  onClick, 
  variant = 'default',
  icon 
}) => {
  const baseClasses = "w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800";
  const variantClasses = variant === 'danger' 
    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20" 
    : "text-slate-700 dark:text-slate-200";

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

interface DropdownMenuSeparatorProps {}

export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = () => {
  return (
    <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
  );
};

interface DropdownMenuLabelProps {
  children: React.ReactNode;
}

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({ children }) => {
  return (
    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {children}
    </div>
  );
};

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export const Select: React.FC<{
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}> = ({ children, value, onValueChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within a Select");
  const { isOpen, setIsOpen } = context;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
    >
      <div className="flex items-center gap-2 truncate">{children}</div>
      <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

export const SelectValue: React.FC<{
  placeholder?: string;
}> = ({ placeholder }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within a Select");
  const { value } = context;

  return <span className={!value ? "text-slate-400" : "text-slate-700 dark:text-slate-200"}>{value || placeholder}</span>;
};

export const SelectContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within a Select");
  const { isOpen } = context;

  if (!isOpen) return null;

  return (
    <div className={`absolute bottom-full lg:bottom-auto lg:top-full left-0 mb-2 lg:mb-0 lg:mt-2 z-[100] w-full min-w-[8rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 animate-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto no-scrollbar ${className}`}>
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value: itemValue, children, className = "" }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within a Select");
  const { value, onValueChange, setIsOpen } = context;

  const isSelected = value === itemValue;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(itemValue);
        setIsOpen(false);
      }}
      className={`flex items-center justify-between w-full px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-left ${
        isSelected ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400'
      } ${className}`}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check size={14} strokeWidth={3} className="shrink-0 ml-2" />}
    </button>
  );
};

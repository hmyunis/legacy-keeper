import React, { cloneElement, createContext, useContext, useId, useMemo, useState } from 'react';

type TooltipSide = 'top' | 'bottom';

interface TooltipContextValue {
  id: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const value = useMemo(() => ({ id, isOpen, setIsOpen }), [id, isOpen]);
  return (
    <TooltipContext.Provider value={value}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger: React.FC<{ children: React.ReactElement; asChild?: boolean }> = ({ children, asChild }) => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('TooltipTrigger must be used inside Tooltip');
  }

  const triggerProps = {
    onMouseEnter: () => context.setIsOpen(true),
    onMouseLeave: () => context.setIsOpen(false),
    onFocus: () => context.setIsOpen(true),
    onBlur: () => context.setIsOpen(false),
    'aria-describedby': context.isOpen ? context.id : undefined,
  };

  if (asChild) {
    return cloneElement(children, {
      ...triggerProps,
      ...children.props,
    });
  }

  return <span {...triggerProps}>{children}</span>;
};

export const TooltipContent: React.FC<{ children: React.ReactNode; side?: TooltipSide; className?: string }> = ({
  children,
  side = 'top',
  className = '',
}) => {
  const context = useContext(TooltipContext);
  if (!context || !context.isOpen) {
    return null;
  }

  const positionClass =
    side === 'bottom'
      ? 'top-full mt-2 left-1/2 -translate-x-1/2'
      : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

  return (
    <div
      id={context.id}
      role="tooltip"
      className={`absolute ${positionClass} z-[120] whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {children}
    </div>
  );
};

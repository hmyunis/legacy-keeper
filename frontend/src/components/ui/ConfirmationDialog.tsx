import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WarningDiamond, X } from '@phosphor-icons/react';
import { Button } from './Button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  eyebrow?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  eyebrow = 'Confirmation Required',
  variant = 'default',
  isLoading = false,
  onConfirm,
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onOpenChange, open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(20,18,17,0.72)] backdrop-blur-md"
            onClick={() => !isLoading && onOpenChange(false)}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-[460px] overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(184,143,91,0.35)] bg-[var(--clr-linen)] shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--clr-gold)] to-transparent opacity-80" />

            <div className="p-6 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                    variant === 'danger'
                      ? 'border-[rgba(139,58,58,0.35)] bg-[rgba(139,58,58,0.1)] text-[var(--clr-danger)]'
                      : 'border-[rgba(184,143,91,0.35)] bg-[var(--clr-gold-muted)] text-[var(--clr-gold-dark)]'
                  }`}>
                    <WarningDiamond size={22} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-ui text-[9px] font-black uppercase tracking-[0.2em] text-[var(--clr-gold-dark)]">
                      {eyebrow}
                    </p>
                    <h2 id="confirmation-dialog-title" className="mt-1 font-display text-[1.45rem] font-bold uppercase leading-tight tracking-wide text-[var(--clr-ink)]">
                      {title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close confirmation"
                  disabled={isLoading}
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] text-[var(--clr-ink)] transition-colors hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div id="confirmation-dialog-description" className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[rgba(219,207,181,0.45)] p-4 font-ui text-[13px] leading-relaxed text-[var(--clr-dust)]">
                {description}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  disabled={isLoading}
                  onClick={onConfirm}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? 'Working...' : confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

type ConfirmVariant = 'danger' | 'primary';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isPending?: boolean;
  requirePassword?: boolean;
  passwordValue?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  passwordError?: string;
  confirmDisabled?: boolean;
  onPasswordChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isPending = false,
  requirePassword = false,
  passwordValue = '',
  passwordLabel = 'Password',
  passwordPlaceholder = 'Enter your password',
  passwordError,
  confirmDisabled = false,
  onPasswordChange,
  onConfirm,
  onCancel,
}) => {
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onCancel();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isPending, onCancel]);

  useEffect(() => {
    if (!isOpen || !requirePassword) return;
    const timer = window.setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, requirePassword]);

  if (!isOpen) return null;

  const confirmClass =
    variant === 'primary'
      ? 'bg-primary text-white hover:opacity-90'
      : 'bg-rose-600 text-white hover:bg-rose-700';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (isPending) return;
        onCancel();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300">
            <AlertTriangle size={16} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
            {requirePassword ? (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {passwordLabel}
                </label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={passwordValue}
                  onChange={(event) => onPasswordChange?.(event.target.value)}
                  placeholder={passwordPlaceholder}
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-900 ${
                    passwordError
                      ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-200'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-primary/20'
                  } focus:outline-none focus:ring-2`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isPending && !confirmDisabled) {
                      onConfirm();
                    }
                  }}
                />
                {passwordError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{passwordError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/30 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

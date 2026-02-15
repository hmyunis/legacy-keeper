import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  error?: string;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-1 ${className}`}>
      <AlertCircle size={14} className="shrink-0" />
      <span>{error}</span>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  error, 
  children, 
  required = false 
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
      <FormError error={error} />
    </div>
  );
};

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { error?: string }> = ({ 
  className = '', 
  error,
  ...props 
}) => {
  return (
    <div className="space-y-2">
      <input
        className={`
          w-full px-4 py-3 bg-white dark:bg-slate-800 
          border rounded-xl text-sm 
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-400' 
            : 'border-slate-200 dark:border-slate-700 focus:border-primary'
          }
          ${className}
        `}
        {...props}
      />
      <FormError error={error} />
    </div>
  );
};

export const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }> = ({ 
  className = '', 
  error,
  ...props 
}) => {
  return (
    <div className="space-y-2">
      <textarea
        className={`
          w-full px-4 py-3 bg-white dark:bg-slate-800 
          border rounded-xl text-sm 
          transition-all duration-200 resize-none
          focus:outline-none focus:ring-2 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-400' 
            : 'border-slate-200 dark:border-slate-700 focus:border-primary'
          }
          ${className}
        `}
        {...props}
      />
      <FormError error={error} />
    </div>
  );
};

export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }> = ({ 
  className = '', 
  error,
  children,
  ...props 
}) => {
  return (
    <div className="space-y-2">
      <select
        className={`
          w-full px-4 py-3 bg-white dark:bg-slate-800 
          border rounded-xl text-sm 
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-400' 
            : 'border-slate-200 dark:border-slate-700 focus:border-primary'
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      <FormError error={error} />
    </div>
  );
};

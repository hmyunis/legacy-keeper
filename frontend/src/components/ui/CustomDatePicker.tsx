import { useState, useRef, useEffect } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export function CustomDatePicker({ value, onChange, className = "", placeholder = "YYYY-MM-DD" }: CustomDatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div
        className={`w-full bg-[var(--clr-paper)] border rounded-[var(--radius-pill)] px-5 py-3 font-ui text-[14px] flex items-center gap-3 transition-colors ${
          isFocused ? 'border-[var(--clr-gold)] text-[var(--clr-ink)]' : 'border-[var(--clr-aged)] text-[var(--clr-ink)] hover:border-[var(--clr-gold)]'
        }`}
      >
        <CalendarBlank className={value ? "text-[var(--clr-gold)]" : "text-[var(--clr-dust)]"} size={18} />
        <span className={value ? '' : 'text-[var(--clr-dust)]'}>{value || placeholder}</span>
      </div>
      <input
        type="date"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
}
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getYear,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { PlatformSelect } from './Select';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

interface PopoverPosition {
  left: number;
  top: number;
  ready: boolean;
}

function getInitialMonth(value: string) {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

export function CustomDatePicker({ value, onChange, className = '', placeholder = 'YYYY-MM-DD' }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => getInitialMonth(value));
  const [position, setPosition] = useState<PopoverPosition>({ left: 0, top: 0, ready: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;
  const hasSelectedDate = !!selectedDate && isValid(selectedDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = getYear(new Date());
  const yearOptions = Array.from({ length: 201 }, (_, i) => currentYear + 100 - i);
  const monthOptions = monthNames.map((name, index) => ({ value: String(index), label: name }));
  const yearSelectOptions = yearOptions.map((year) => ({ value: String(year), label: String(year) }));

  // Sync calendar view when value prop changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseISO(value);
      if (isValid(parsed)) {
        setViewMonth(parsed);
      }
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const padding = 12;
    const gap = 10;
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - popoverRect.height - gap;
    const hasRoomBelow = belowTop + popoverRect.height <= window.innerHeight - padding;
    const top = hasRoomBelow ? belowTop : Math.max(padding, aboveTop);
    const left = Math.min(
      Math.max(padding, triggerRect.left),
      Math.max(padding, window.innerWidth - popoverRect.width - padding),
    );

    setPosition({ left, top, ready: true });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    setPosition((current) => ({ ...current, ready: false }));
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      
      // Keep open if clicking inside the date picker input trigger or the calendar popover itself
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }

      // Keep open if clicking inside portaled Select menus or dropdown options
      let current = target as HTMLElement | null;
      while (current) {
        if (
          current.getAttribute?.('role') === 'listbox' ||
          current.getAttribute?.('role') === 'option' ||
          current.hasAttribute?.('data-radix-select-viewport') ||
          current.hasAttribute?.('data-radix-popper-content-wrapper')
        ) {
          return;
        }
        current = current.parentElement;
      }

      setIsOpen(false);
      setIsFocused(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const monthStart = startOfMonth(viewMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const chooseDate = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
    setIsFocused(false);
  };

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          setIsFocused(true);
        }}
        onFocus={() => setIsFocused(true)}
        className={`w-full bg-[var(--clr-paper)] border rounded-[var(--radius-pill)] px-5 py-3 font-ui text-[14px] flex items-center gap-3 transition-colors text-left cursor-pointer ${
          isFocused || isOpen ? 'border-[var(--clr-gold)] text-[var(--clr-ink)]' : 'border-[var(--clr-aged)] text-[var(--clr-ink)] hover:border-[var(--clr-gold)]'
        }`}
      >
        <CalendarBlank className={value ? 'text-[var(--clr-gold)]' : 'text-[var(--clr-dust)]'} size={18} />
        <span className={`min-w-0 flex-1 truncate ${value ? '' : 'text-[var(--clr-dust)]'}`}>
          {value || placeholder}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-[min(320px,calc(100vw-24px))] rounded-[var(--radius-md)] border border-[rgba(184,143,91,0.45)] bg-[var(--clr-linen)] p-3 shadow-[0_18px_48px_rgba(20,18,17,0.35)]"
          style={{
            left: position.left,
            top: position.top,
            opacity: position.ready ? 1 : 0,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth((month) => addMonths(month, -1))}
              className="w-9 h-9 rounded-full border border-[var(--clr-aged)] text-[var(--clr-dust)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <PlatformSelect
                value={String(viewMonth.getMonth())}
                onValueChange={(nextMonth) => setViewMonth((month) => setMonth(month, Number(nextMonth)))}
                options={monthOptions}
                className="min-h-8 h-8 min-w-0 w-full gap-1 px-2 py-1 bg-[var(--clr-paper)] text-[10px] uppercase tracking-[0.04em] shadow-none [&_svg]:h-3 [&_svg]:w-3"
              />
              <PlatformSelect
                value={String(getYear(viewMonth))}
                onValueChange={(nextYear) => setViewMonth((month) => setYear(month, Number(nextYear)))}
                options={yearSelectOptions}
                className="min-h-8 h-8 min-w-0 w-full gap-1 px-2 py-1 bg-[var(--clr-paper)] text-[10px] uppercase tracking-[0.04em] shadow-none [&_svg]:h-3 [&_svg]:w-3"
              />
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
              className="w-9 h-9 rounded-full border border-[var(--clr-aged)] text-[var(--clr-dust)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1 font-ui text-[9px] font-black uppercase text-[var(--clr-gold-dark)]">
                {day}
              </span>
            ))}
            {calendarDays.map((day) => {
              const selected = hasSelectedDate && isSameDay(day, selectedDate);
              const muted = !isSameMonth(day, viewMonth);

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => chooseDate(day)}
                  className={`aspect-square rounded-[var(--radius-sm)] font-ui text-[12px] font-bold transition-all ${
                    selected
                      ? 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)] shadow-[var(--shadow-gold)]'
                      : muted
                        ? 'text-[var(--clr-aged)] hover:bg-[var(--clr-paper)]'
                        : 'text-[var(--clr-ink)] hover:bg-[var(--clr-gold-muted)] hover:text-[var(--clr-gold-dark)]'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--clr-aged)] pt-3">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setIsFocused(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--clr-dust)] hover:text-[var(--clr-danger)] transition-colors"
            >
              <X size={12} weight="bold" /> Clear
            </button>
            <button
              type="button"
              onClick={() => chooseDate(new Date())}
              className="rounded-full border border-[var(--clr-gold)] px-4 py-2 font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--clr-gold-dark)] hover:bg-[var(--clr-gold)] hover:text-[var(--clr-charcoal)] transition-colors"
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
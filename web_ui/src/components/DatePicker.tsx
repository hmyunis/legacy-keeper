
import React, { useState, useRef, useEffect } from 'react';
import { format, setMonth, setYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface DatePickerProps {
  date?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ date, onChange, placeholder = "Select date", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(date || new Date());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  // Family archives often go back far
  const years = Array.from({ length: 150 }, (_, i) => currentYear - i);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate)),
    end: endOfWeek(endOfMonth(viewDate)),
  });

  const handleDayClick = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const changeMonth = (monthIndex: number) => {
    setViewDate(setMonth(viewDate, monthIndex));
    setIsMonthPickerOpen(false);
  };

  const changeYear = (year: number) => {
    setViewDate(setYear(viewDate, year));
    setIsYearPickerOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200 flex items-center justify-between group transition-all"
      >
        <span className={date ? "text-slate-900 dark:text-slate-200" : "text-slate-400"}>
          {date ? format(date, 'PPP') : placeholder}
        </span>
        <CalendarIcon size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-[110] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 w-[280px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                {format(viewDate, 'MMMM')} <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                {format(viewDate, 'yyyy')} <ChevronDown size={12} />
              </button>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {isYearPickerOpen && (
            <div className="absolute inset-x-4 top-[50px] bottom-4 bg-white dark:bg-slate-900 z-10 overflow-y-auto no-scrollbar rounded-xl border border-slate-100 dark:border-slate-800 p-2 grid grid-cols-3 gap-1">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => changeYear(year)}
                  className={`text-[10px] font-bold py-2 rounded-lg hover:bg-primary/5 transition-colors ${getYear(viewDate) === year ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {isMonthPickerOpen && (
            <div className="absolute inset-x-4 top-[50px] bottom-4 bg-white dark:bg-slate-900 z-10 overflow-y-auto no-scrollbar rounded-xl border border-slate-100 dark:border-slate-800 p-2 grid grid-cols-2 gap-1">
              {months.map((month, idx) => (
                <button
                  key={month}
                  onClick={() => changeMonth(idx)}
                  className={`text-[10px] font-bold py-2 rounded-lg hover:bg-primary/5 transition-colors ${viewDate.getMonth() === idx ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {month}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = date && isSameDay(day, date);
              const isCurrentMonth = isSameMonth(day, viewDate);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square rounded-lg text-[10px] font-bold flex items-center justify-center transition-all
                    ${isSelected ? 'bg-primary text-white shadow-lg' : ''}
                    ${!isSelected && isCurrentMonth ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                    ${!isSelected && !isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setViewDate(new Date()); handleDayClick(new Date()); }}
              className="w-full py-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/5 rounded-xl transition-all"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;

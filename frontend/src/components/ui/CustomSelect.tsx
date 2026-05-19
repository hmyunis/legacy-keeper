import { type SelectHTMLAttributes } from 'react';

interface CustomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function CustomSelect({ className = "", children, ...props }: CustomSelectProps) {
  return (
    <select
      className={`appearance-none outline-none transition-colors bg-no-repeat bg-[position:calc(100%-20px)_center] ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%23B88F5B' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`
      }}
      {...props}
    >
      {children}
    </select>
  );
}
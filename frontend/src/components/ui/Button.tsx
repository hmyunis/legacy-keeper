import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'ref'> {
  variant?: 'primary' | 'ghost' | 'danger' | 'icon';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', children, className = '', ...props }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center gap-[var(--space-2)] font-ui font-bold uppercase tracking-[0.12em] text-[var(--type-button)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clr-gold)] disabled:opacity-50 disabled:cursor-not-allowed hover-shine relative overflow-hidden';

  const variants = {
    primary: 'bg-[var(--clr-gold)] text-[var(--clr-linen)] rounded-[var(--radius-pill)] px-[32px] py-[14px] shadow-[var(--shadow-md)]',
    ghost: 'bg-transparent text-[var(--clr-gold)] border-[1.5px] border-[var(--clr-gold)] rounded-[var(--radius-pill)] px-[31px] py-[13px] hover:bg-[rgba(184,143,91,0.1)]',
    danger: 'bg-transparent text-[var(--clr-danger)] border-[1.5px] border-[var(--clr-danger)] rounded-[var(--radius-pill)] px-[31px] py-[13px] hover:bg-[var(--clr-danger)] hover:text-[var(--clr-linen)]',
    icon: 'w-[40px] h-[40px] rounded-full border border-[var(--clr-aged)] bg-transparent text-[var(--clr-ink)] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] hover:bg-[rgba(184,143,91,0.08)]'
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.03 }} 
      whileTap={{ scale: 0.96 }} 
      transition={{ type: "spring", stiffness: 400, damping: 17 }} 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      {...props as any}
    >
      {children}
    </motion.button>
  );
};
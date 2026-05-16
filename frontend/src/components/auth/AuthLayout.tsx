import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export const AuthLayout = ({ children, title, subtitle }: { children: ReactNode, title: string, subtitle: string }) => (
  <div className="min-h-screen bg-[var(--clr-charcoal)] flex items-center justify-center p-6 relative overflow-hidden">
    {/* Cinematic Fading Background */}
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--clr-charcoal)] to-transparent z-10" />
      <motion.img
        initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
        src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000"
        className="w-full h-full object-cover grayscale"
      />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="relative z-10 w-full max-w-lg bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.2)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow-lg)]"
    >
      <div className="text-center mb-8">
        <h1 className="font-display text-[1.75rem] text-[var(--clr-linen)] tracking-widest">{title}</h1>
        <p className="font-script text-[32px] text-[var(--clr-gold)] leading-[0.5] mt-4">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  </div>
);
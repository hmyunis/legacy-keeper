import { motion } from 'framer-motion';
import { House, MagnifyingGlass, ArrowLeft } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(184, 143, 91, 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, rgba(184, 143, 91, 0.1) 0%, transparent 50%)`,
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center relative z-10 max-w-[600px]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <span className="font-display text-[12rem] leading-none text-transparent bg-clip-text bg-gradient-to-b from-[var(--clr-gold)] to-[var(--clr-gold-dark)] opacity-80">
              404
            </span>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[var(--clr-gold)] to-transparent opacity-60" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h1 className="font-display text-[2.5rem] text-[var(--clr-linen)] mb-4 uppercase tracking-wider">
            Page Not Found
          </h1>
          <div className="w-16 h-px bg-[var(--clr-gold)] mx-auto mb-6 opacity-60" />
          <p className="font-script text-[2rem] text-[var(--clr-gold)] leading-relaxed mb-4">
            "This memory seems to have been misplaced in time..."
          </p>
          <p className="font-ui text-[14px] text-[var(--clr-fog)] leading-relaxed max-w-[400px] mx-auto mb-10">
            The archive you seek may have been moved, deleted, or never existed in this timeline.
            Let us guide you back to familiar ground.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/dashboard">
            <Button variant="primary" className="px-8 py-4 text-[12px] flex items-center gap-2">
              <House size={18} weight="fill" />
              Return to Dashboard
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-fog)] hover:text-[var(--clr-gold)] transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <MagnifyingGlass size={32} className="text-[var(--clr-gold)] opacity-40" />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(184,143,91,0.3)] to-transparent" />
    </div>
  );
}
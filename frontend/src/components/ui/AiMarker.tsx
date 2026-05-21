import { MagicWand } from '@phosphor-icons/react';
import { Tooltip } from './Tooltip';

interface AiMarkerProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

export function AiMarker({ label = 'AI-generated content', compact = false, className = '' }: AiMarkerProps) {
  return (
    <Tooltip content={label}>
      <span
        aria-label={label}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(184,143,91,0.42)] bg-[rgba(184,143,91,0.12)] text-[var(--clr-gold-dark)] shadow-sm ${compact ? 'h-5 px-1.5 text-[8px]' : 'h-6 px-2 text-[9px]'} font-ui font-black uppercase tracking-[0.14em] ${className}`}
      >
        <MagicWand size={compact ? 10 : 12} weight="fill" />
        {!compact && <span>AI</span>}
      </span>
    </Tooltip>
  );
}

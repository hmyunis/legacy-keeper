import { type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

type TooltipSide = NonNullable<TooltipProps['side']>;

interface TooltipPosition {
  left: number;
  top: number;
  side: TooltipSide;
  ready: boolean;
}

const OPPOSITE_SIDE: Record<TooltipSide, TooltipSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export function Tooltip({ children, content, side = 'top', className = '' }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
    side,
    ready: false,
  });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const padding = 12;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
    const coordinatesForSide = (candidateSide: TooltipSide) => {
      if (candidateSide === 'top') {
        return {
          top: triggerRect.top - tooltipRect.height - gap,
          left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        };
      }
      if (candidateSide === 'bottom') {
        return {
          top: triggerRect.bottom + gap,
          left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        };
      }
      if (candidateSide === 'left') {
        return {
          top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
          left: triggerRect.left - tooltipRect.width - gap,
        };
      }
      return {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.right + gap,
      };
    };

    const candidates: TooltipSide[] = [
      side,
      OPPOSITE_SIDE[side],
      side === 'top' || side === 'bottom' ? 'right' : 'top',
      side === 'top' || side === 'bottom' ? 'left' : 'bottom',
    ];

    const chosenSide = candidates.find((candidateSide) => {
      const coordinates = coordinatesForSide(candidateSide);
      return (
        coordinates.top >= padding &&
        coordinates.left >= padding &&
        coordinates.top + tooltipRect.height <= viewportHeight - padding &&
        coordinates.left + tooltipRect.width <= viewportWidth - padding
      );
    }) || side;

    const chosenCoordinates = coordinatesForSide(chosenSide);
    setPosition({
      side: chosenSide,
      left: clamp(chosenCoordinates.left, padding, viewportWidth - tooltipRect.width - padding),
      top: clamp(chosenCoordinates.top, padding, viewportHeight - tooltipRect.height - padding),
      ready: true,
    });
  }, [side]);

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

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onPointerEnter={() => setIsOpen(true)}
      onPointerLeave={() => setIsOpen(false)}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={() => setIsOpen(false)}
    >
      <span aria-describedby={id} className="inline-flex min-w-0">
        {children}
      </span>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <span
          id={id}
          ref={tooltipRef}
          role="tooltip"
          data-side={position.side}
          className="pointer-events-none fixed z-[9999] max-w-[min(260px,calc(100vw-24px))] whitespace-normal break-words rounded-[var(--radius-sm)] border border-[rgba(212,169,106,0.45)] bg-[rgba(20,18,17,0.96)] px-3 py-2 text-center font-ui text-[10px] font-bold uppercase leading-[1.45] tracking-[0.14em] text-[var(--clr-linen)] shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-opacity duration-150"
          style={{
            left: position.left,
            top: position.top,
            opacity: position.ready ? 1 : 0,
          }}
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}

import { useState, useRef, useCallback } from 'react';
import { X, ArrowClockwise, Sparkle, Download, Share } from '@phosphor-icons/react';

interface RestorationSliderProps {
  onClose: () => void;
  originalUrl: string;
  restoredUrl: string;
  title: string;
  onApply?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export default function RestorationSlider({ onClose, originalUrl, restoredUrl, title, onApply, onDownload, onShare }: RestorationSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(14,12,11,0.95)] backdrop-blur-md flex items-center justify-center p-4 lg:p-8">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-[rgba(184,143,91,0.3)] bg-[rgba(20,18,17,0.8)] text-[var(--clr-fog)] hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      <div className="max-w-6xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-[rgba(184,143,91,0.15)] text-[var(--clr-gold)] px-4 py-2 rounded-full mb-4">
            <Sparkle size={16} weight="fill" />
            <span className="font-ui text-xs font-bold uppercase tracking-widest">AI Restoration</span>
          </div>
          <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-linen)] mb-2">{title}</h2>
          <p className="font-ui text-[var(--clr-fog)] text-sm">Drag the slider to reveal the restored image</p>
        </div>

        <div
          ref={containerRef}
          className="relative w-full aspect-[16/10] rounded-[var(--radius-lg)] overflow-hidden cursor-ew-resize select-none border border-[rgba(184,143,91,0.2)] shadow-[var(--shadow-lg)]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <img
            src={restoredUrl}
            alt="Restored"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={originalUrl}
              alt="Original"
              className="absolute inset-0 w-full h-full object-cover sepia-[0.8] contrast-125 brightness-75"
              style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
            />
          </div>

          <div
            className="absolute top-0 bottom-0 w-1 bg-[var(--clr-gold)] cursor-ew-resize"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--clr-gold)] flex items-center justify-center shadow-[var(--shadow-gold)]">
              <ArrowClockwise size={20} className="text-[var(--clr-charcoal)]" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-[rgba(20,18,17,0.85)] backdrop-blur-sm text-[var(--clr-fog)] px-3 py-1.5 rounded-full text-xs font-ui uppercase tracking-wider">
            Original
          </div>
          <div className="absolute bottom-4 right-4 bg-[rgba(184,143,91,0.85)] backdrop-blur-sm text-[var(--clr-linen)] px-3 py-1.5 rounded-full text-xs font-ui uppercase tracking-wider">
            Restored
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button onClick={onApply} className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--clr-gold)] text-[var(--clr-linen)] font-ui font-bold text-xs uppercase tracking-widest hover:bg-[var(--clr-gold-light)] transition-colors">
            <ArrowClockwise size={16} /> Apply to Gallery
          </button>
          <button onClick={onDownload} className="flex items-center gap-2 px-6 py-3 rounded-full border border-[rgba(184,143,91,0.3)] text-[var(--clr-fog)] font-ui font-bold text-xs uppercase tracking-widest hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors">
            <Download size={16} /> Download
          </button>
          <button
            onClick={onShare}
            disabled={!onShare}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[rgba(184,143,91,0.3)] text-[var(--clr-fog)] font-ui font-bold text-xs uppercase tracking-widest hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[rgba(184,143,91,0.3)] disabled:hover:text-[var(--clr-fog)]"
          >
            <Share size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

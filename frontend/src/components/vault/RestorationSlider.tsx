import { useState, useRef, type MouseEvent, type TouchEvent } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';

interface RestorationSliderProps {
  originalSrc: string;
  restoredSrc: string;
}

export default function RestorationSlider({ originalSrc, restoredSrc }: RestorationSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <span className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-dust)]">Original</span>
        <span className="font-ui text-[11px] font-bold uppercase tracking-widest text-[var(--clr-gold)]">AI Restored</span>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-[var(--radius-md)] overflow-hidden cursor-ew-resize border border-[var(--clr-aged)] select-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <img src={restoredSrc} alt="Restored" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img src={originalSrc} alt="Original" className="absolute inset-0 w-[100vw] max-w-[none] h-full object-cover" style={{ width: containerRef.current?.offsetWidth }} draggable={false} />
        </div>

        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[var(--clr-gold)] z-10 flex items-center justify-center"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <button 
            className="w-10 h-10 bg-[var(--clr-gold)] rounded-full flex items-center justify-center text-[var(--clr-charcoal)] shadow-[var(--shadow-gold)] hover:scale-110 transition-transform focus:outline-none"
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
          >
            <ArrowsLeftRight size={20} weight="bold" />
          </button>
        </div>
      </div>
      <p className="text-center font-ui text-[11px] text-[var(--clr-fog)] mt-2">
        Drag the slider to compare original and AI-restored versions.
      </p>
    </div>
  );
}
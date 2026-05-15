export const TornEdge = ({ direction = 'dark-to-light' }: { direction?: 'dark-to-light' | 'light-to-dark' }) => {
  const fillColor = direction === 'dark-to-light' ? 'var(--clr-charcoal)' : 'var(--clr-parchment)';
  return (
    <div className="relative w-full h-[60px] -mt-[1px] z-10 pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block">
        <path d="M0,0 L0,35 Q60,55 120,38 Q200,18 280,42 Q360,60 440,36 Q520,12 600,44 Q680,60 760,32 Q840,8 920,40 Q1000,60 1080,34 Q1160,10 1240,42 Q1320,60 1380,38 L1440,42 L1440,0 Z" fill={fillColor}/>
      </svg>
    </div>
  );
};
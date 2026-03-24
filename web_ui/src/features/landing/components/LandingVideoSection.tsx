import type { FC, RefObject } from 'react';

interface LandingVideoSectionProps {
  videoRef: RefObject<HTMLDivElement | null>;
}

export const LandingVideoSection: FC<LandingVideoSectionProps> = ({ videoRef }) => (
  <section ref={videoRef} className="py-16 sm:py-24 px-4 sm:px-6 bg-white dark:bg-slate-900/40">
    <div className="max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-10 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">See It In Action</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto">Watch how LegacyKeeper transforms your family memories into an organized, interactive archive.</p>
      </div>
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 aspect-video bg-slate-900">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=example"
          title="LegacyKeeper Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  </section>
);

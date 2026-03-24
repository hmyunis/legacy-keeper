import type { FC } from 'react';
import { Calendar, FileText, GitBranch, MapPin, Search, Share2, Smile, Tag, type LucideIcon } from 'lucide-react';

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
  colorClass: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: Smile,
    title: 'Face Recognition',
    description: 'Automatically identifies and groups photos by family members.',
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Calendar,
    title: 'Smart Timeline',
    description: 'Photos organized by date automatically with AI assistance.',
    colorClass: 'bg-green-50 text-green-600',
  },
  {
    icon: MapPin,
    title: 'Location Tagging',
    description: 'Map view of where your memories were captured.',
    colorClass: 'bg-rose-50 text-rose-600',
  },
  {
    icon: GitBranch,
    title: 'Family Tree',
    description: 'Build interactive trees and link photos to ancestors.',
    colorClass: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find any photo instantly with AI-powered search.',
    colorClass: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Tag,
    title: 'Auto-Tagging',
    description: 'AI suggests tags for people, places, and events.',
    colorClass: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: Share2,
    title: 'Family Circle',
    description: 'Securely share memories with trusted family members.',
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description: 'Store important documents securely for future generations.',
    colorClass: 'bg-indigo-50 text-indigo-600',
  },
];

export const LandingFeatureGrid: FC = () => (
  <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-900/40 relative">
    <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
      <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Powerful Features</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Everything you need to preserve and share your family's story.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {FEATURE_CARDS.map((feature) => (
          <div key={feature.title} className="p-5 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-4xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
            <div className={`w-12 h-12 ${feature.colorClass} dark:bg-slate-900 rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <feature.icon size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

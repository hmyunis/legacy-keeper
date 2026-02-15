import React, { useState, useRef } from 'react';
import { Shield, GitBranch, Sparkles, Users, ArrowRight, Check, Zap, Crown, Database, LayoutDashboard, LogOut, ChevronDown, Play, User, Calendar, MapPin, FileText, Share2, Search, Tag, Clock, Smile } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/DropdownMenu';

const PLANS = [
  {
    name: 'Free',
    storage: '10GB',
    price: '$0',
    desc: 'Perfect for starting your family archive.',
    icon: <Shield className="text-slate-400" />,
    features: [
      '10GB Secure Storage',
      'AI-Powered Photo Organization',
      'Interactive Family Tree',
      'Smart Date & Location Tagging',
      'Share Memories with Family',
      'Timeline View of History'
    ],
    color: 'bg-slate-50 dark:bg-slate-900',
    button: 'Start Free',
    badge: null
  },
  {
    name: 'Plus',
    storage: '10GB',
    price: 'Coming Soon',
    desc: 'More space for growing families.',
    icon: <Zap className="text-primary" />,
    features: [
      '10GB Secure Storage',
      'AI-Powered Photo Organization',
      'Interactive Family Tree',
      'Smart Date & Location Tagging',
      'Share Memories with Family',
      'Timeline View of History'
    ],
    color: 'bg-primary/5 dark:bg-primary/10 border-primary/20',
    button: 'Coming Soon',
    badge: 'Most Popular'
  },
  {
    name: 'Premium',
    storage: '50GB',
    price: 'Coming Soon',
    desc: 'Comprehensive archive for large families.',
    icon: <Crown className="text-amber-500" />,
    features: [
      '50GB Secure Storage',
      'AI-Powered Photo Organization',
      'Interactive Family Tree',
      'Smart Date & Location Tagging',
      'Share Memories with Family',
      'Timeline View of History'
    ],
    color: 'bg-slate-900 text-white',
    button: 'Coming Soon',
    badge: null
  },
  {
    name: 'Legacy',
    storage: '100GB',
    price: 'Coming Soon',
    desc: 'Ultimate archive for generational historians.',
    icon: <Crown className="text-amber-500" />,
    features: [
      '100GB Secure Storage',
      'AI-Powered Photo Organization',
      'Interactive Family Tree',
      'Smart Date & Location Tagging',
      'Share Memories with Family',
      'Timeline View of History'
    ],
    color: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    button: 'Coming Soon',
    badge: null
  }
];

const Landing: React.FC = () => {
  const { isAuthenticated, currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const handleDashboard = () => {
    navigate({ to: '/dashboard' });
    setIsDropdownOpen(false);
  };

  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-3 shrink-0 group/logo transition-opacity hover:opacity-80"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 text-sm sm:text-base">L</div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-xl tracking-tight xs:block">LegacyKeeper</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            {isAuthenticated && currentUser ? (
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <img 
                    src={currentUser.profilePhoto} 
                    alt={currentUser.fullName}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
                <DropdownMenu 
                  isOpen={isDropdownOpen} 
                  onClose={() => setIsDropdownOpen(false)}
                  align="right"
                >
                  <DropdownMenuItem 
                    onClick={handleDashboard}
                    icon={<LayoutDashboard size={16} />}
                  >
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    variant="danger"
                    icon={<LogOut size={16} />}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors uppercase tracking-widest px-2 sm:px-3 py-2">Sign In</Link>
                <Link to="/signup" className="bg-primary text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs hover:opacity-90 transition-all shadow-lg shadow-primary/20 glow-primary uppercase tracking-widest whitespace-nowrap">Open Vault</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em]">
              <Sparkles size={14} /> The Future of Heritage
            </div>
            <h1 className="text-3xl sm:text-4xl xs:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Preserving <span className="text-primary">Memories</span> for Tomorrow.
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              An intelligent family memory vault that uses AI to organize your photos, videos, and documents. Build your interactive family tree and preserve your legacy for generations to come.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 hover:opacity-90 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group text-center text-xs sm:text-sm">
                  Go to Dashboard
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 hover:opacity-90 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group text-center text-xs sm:text-sm">
                    Begin Your Legacy
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button 
                    onClick={scrollToVideo}
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 sm:gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-xs sm:text-sm"
                  >
                    <Play size={18} />
                    Explore Demo
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="relative animate-in slide-in-from-right duration-1000">
            <div className="absolute -top-10 -left-10 w-32 h-32 sm:w-40 sm:h-40 bg-primary/20 rounded-full blur-[60px] sm:blur-[80px]"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-indigo-400/20 rounded-full blur-[60px] sm:blur-[80px]"></div>
            <div className="relative bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-4xl sm:rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 rotate-2 group hover:rotate-0 transition-transform duration-700">
              <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1000" className="rounded-3xl sm:rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-700" alt="Legacy" />
              <div className="absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce duration-3000">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-tighter">Security</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">End-to-End Encrypted</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
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

      {/* Feature Grid */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-900/40 relative">
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Powerful Features</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Everything you need to preserve and share your family's story.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              { icon: <Smile />, title: 'Face Recognition', desc: 'Automatically identifies and groups photos by family members.', color: 'bg-blue-50 text-blue-600' },
              { icon: <Calendar />, title: 'Smart Timeline', desc: 'Photos organized by date automatically with AI assistance.', color: 'bg-green-50 text-green-600' },
              { icon: <MapPin />, title: 'Location Tagging', desc: 'Map view of where your memories were captured.', color: 'bg-rose-50 text-rose-600' },
              { icon: <GitBranch />, title: 'Family Tree', desc: 'Build interactive trees and link photos to ancestors.', color: 'bg-purple-50 text-purple-600' },
              { icon: <Search />, title: 'Smart Search', desc: 'Find any photo instantly with AI-powered search.', color: 'bg-amber-50 text-amber-600' },
              { icon: <Tag />, title: 'Auto-Tagging', desc: 'AI suggests tags for people, places, and events.', color: 'bg-cyan-50 text-cyan-600' },
              { icon: <Share2 />, title: 'Family Circle', desc: 'Securely share memories with trusted family members.', color: 'bg-emerald-50 text-emerald-600' },
              { icon: <FileText />, title: 'Document Vault', desc: 'Store important documents securely for future generations.', color: 'bg-indigo-50 text-indigo-600' },
            ].map((feature, i) => (
              <div key={i} className="p-5 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-4xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                <div className={`w-12 h-12 ${feature.color} dark:bg-slate-900 rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(feature.icon as any, { size: 24 })}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] animate-pulse">
            <Sparkles size={14} /> Limited Time Offer
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Everything is Free</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto">
            We're giving <span className="font-bold text-primary">10GB of free storage</span> to every user who signs up during our launch period. All features are included - no hidden fees, no premium tiers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Link to="/signup" className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm shadow-xl shadow-primary/30">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <button 
              onClick={scrollToVideo}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm border border-slate-200 dark:border-slate-700"
            >
              <Play size={18} />
              Watch Demo
            </button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-2 text-slate-400">
            <Shield size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">End-to-end encryption included</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-12 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg">L</div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">LegacyKeeper</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">© {new Date().getFullYear()} LegacyKeeper. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6">
            <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Privacy</button>
            <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Security</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

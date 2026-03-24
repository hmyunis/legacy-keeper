import React, { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LandingFeatureGrid } from '@/features/landing/components/LandingFeatureGrid';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { LandingFreeSection } from '@/features/landing/components/LandingFreeSection';
import { LandingHeroSection } from '@/features/landing/components/LandingHeroSection';
import { LandingNavbar } from '@/features/landing/components/LandingNavbar';
import { LandingVideoSection } from '@/features/landing/components/LandingVideoSection';
import { useAuthStore } from '@/stores/authStore';

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
      <LandingNavbar
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        isDropdownOpen={isDropdownOpen}
        onToggleDropdown={() => setIsDropdownOpen((current) => !current)}
        onCloseDropdown={() => setIsDropdownOpen(false)}
        onDashboard={handleDashboard}
        onLogout={handleLogout}
      />
      <LandingHeroSection
        isAuthenticated={isAuthenticated}
        onScrollToVideo={scrollToVideo}
      />
      <LandingVideoSection videoRef={videoRef} />
      <LandingFeatureGrid />
      <LandingFreeSection onScrollToVideo={scrollToVideo} />
      <LandingFooter />
    </div>
  );
};

export default Landing;

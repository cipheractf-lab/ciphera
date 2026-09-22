import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(
    AuthContext as React.Context<{ isAuthenticated: boolean }>
  );
  const { eventName } = useSiteConfig();
  const platformName = eventName || 'Ciphera';
  const heroImage = '/assests/ciphera.png';

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/challenges');
    } else {
      navigate('/register');
    }
  };

  const handleExplore = () => {
    navigate('/challenges');
  };

  return (
    <div className="relative isolate w-full h-full max-h-screen flex flex-col justify-center overflow-hidden bg-[#050506] text-[#F5F1EA]">
      {/* Background Graphic Layer - ciphera.png clearly visible in the website background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
        <img
          src={heroImage}
          alt="Ciphera Cyber Background"
          className="h-full w-full object-cover object-center opacity-80 md:opacity-90"
        />
        {/* Soft horizontal gradient only behind the left text column for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050506]/80 via-transparent to-[#050506]/30" />
      </div>
      <div className="pointer-events-none absolute left-[8%] top-[14%] z-[1] h-72 w-72 rounded-full bg-[#7C3AED]/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[10%] right-[10%] z-[1] h-96 w-96 rounded-full bg-[#7C3AED]/[0.04] blur-3xl" />

      {/* Main hero content - fitting within single viewport */}
      <section className="relative z-10 flex-1 flex items-center justify-start w-full px-6 sm:px-10 md:px-14 lg:px-20 xl:px-28 py-4 sm:py-6 md:py-8">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center space-y-4 sm:space-y-6"
          >
            {/* Arena Tag / Badge with Technical Indicator */}
            <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#1E2535] bg-[#000000]/90 py-2 pl-2.5 pr-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A3AD] shadow-sm backdrop-blur-md">
              <div className="h-5 w-5 overflow-hidden rounded-full border border-[#7C3AED]/60">
                <img
                  src={heroImage}
                  alt="Ciphera logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-[#F5F1EA]">Purple Ops Arena</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED] shadow-[0_0_8px_#7C3AED]" />
              <span className="text-[10px] text-[#7C3AED] tracking-[0.16em]">ONLINE</span>
            </div>

            {/* Brand Title & Official Tagline */}
            <div className="space-y-3">
              <h1 className="leading-[1.02]">
                <span className="ciphera-brand-wordmark text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
                  {platformName.toUpperCase() === 'CIPHERA' ? (
                    <>
                      <span className="ciphera-chrome-silver">CIPHE</span>
                      <span className="ciphera-chrome-violet">RA</span>
                    </>
                  ) : (
                    <span className="ciphera-chrome-silver">{platformName.toUpperCase()}</span>
                  )}
                </span>
              </h1>
              
              <div
                className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#7C3AED]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Hack. Learn. Compete. Grow.
              </div>
            </div>

            {/* Platform Description */}
            <p className="max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-[#A8A3AD]">
              A production-ready cybersecurity and Capture The Flag arena built for tactical training, team offensive operations, and focused competitive mastery.
            </p>

            {/* Secondary Technical Metadata Line */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-mono text-[#6F6973] pt-1">
              <Terminal className="h-4 w-4 text-[#7C3AED] shrink-0" />
              <span className="text-[#7C3AED] font-medium">CYBER ARENA</span>
              <span>•</span>
              <span>REV</span>
              <span>•</span>
              <span>PWN</span>
              <span>•</span>
              <span>CRYPTO</span>
              <span>•</span>
              <span>WEB</span>
              <span>•</span>
              <span>FORENSICS</span>
            </div>

            {/* Action Buttons: Start Hacking & Explore Challenges */}
            <div className="flex flex-col sm:flex-row gap-4 pt-3">
              <button
                onClick={handleStart}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#7C3AED] px-8 py-4 text-base font-semibold text-[#F5F1EA] shadow-[0_4px_24px_rgba(124,58,237,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#9333EA] hover:shadow-[0_8px_32px_rgba(147,51,234,0.5)] active:translate-y-0 w-full sm:w-auto"
              >
                <Zap className="h-5 w-5" />
                <span>Start Hacking</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={handleExplore}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2535] bg-[#000000]/90 px-8 py-4 text-base font-semibold text-[#F5F1EA] shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0A0D14] hover:border-[#7C3AED]/50 active:translate-y-0 w-full sm:w-auto"
              >
                <Shield className="h-5 w-5 text-[#7C3AED]" />
                <span>Explore Challenges</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

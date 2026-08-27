import React, { useState } from 'react';
import { BrandHeader } from './BrandHeader';
import { AuthModal } from './AuthModal';
import { BookOpen, Wallet, Sparkles, ArrowRight, ShieldCheck, Lock, BrainCircuit } from 'lucide-react';

interface LandingPageProps {}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div id="nivora-landing-page" className="min-h-screen bg-[#f5f1eb] flex flex-col justify-between p-4 sm:p-6 md:p-10 max-w-6xl mx-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between py-4">
        <BrandHeader compact />
        <div className="flex items-center gap-3">
          <button
            id="landing-signin-nav-btn"
            onClick={() => openAuth('signin')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#7b4a27] hover:text-[#63391d] bg-[#f5f1eb] hover:bg-[#eee7de] border border-[#e8ddd2] rounded-[14px] transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            id="landing-getstarted-nav-btn"
            onClick={() => openAuth('signup')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#7b4a27] hover:bg-[#63391d] rounded-[14px] transition-colors shadow-2xs cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="my-10 sm:my-14 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f3e8dc] border border-[#e8ddd2] text-[#7b4a27] text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Private &amp; Secure Cloud Intelligence</span>
        </div>

        <BrandHeader className="mb-4" />

        <p className="text-base sm:text-xl text-[#756b63] max-w-2xl mx-auto font-light leading-relaxed mt-4 mb-8">
          &ldquo;One private space for your thoughts, finances, and personal insights.&rdquo;
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <button
            id="landing-hero-getstarted-btn"
            onClick={() => openAuth('signup')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white font-semibold text-sm sm:text-base shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="landing-hero-signin-btn"
            onClick={() => openAuth('signin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] bg-white/80 hover:bg-white border border-[#dfd3c7] text-[#1f1b18] font-semibold text-sm sm:text-base shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <span>Sign In</span>
          </button>
        </div>

        {/* Feature Cards Grid (245px min height, 22px gap, 24px radius, hover elevation) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px] mt-16 text-left">
          {/* Feature 1: Journal */}
          <div
            id="landing-card-journal"
            className="bg-white/90 backdrop-blur-xs border border-[#e8ddd2] rounded-[24px] p-6 sm:p-7 min-h-[245px] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[16px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1f1b18] mb-2">
                Journal
              </h3>
              <p className="text-sm text-[#756b63] leading-relaxed">
                Capture thoughts, memories, reflections, and important moments with clean, intentional writing spaces.
              </p>
            </div>
            <div className="pt-4 mt-auto">
              <span className="text-xs font-semibold text-[#7b4a27] inline-flex items-center gap-1">
                Reflections &amp; Moods
              </span>
            </div>
          </div>

          {/* Feature 2: Finance */}
          <div
            id="landing-card-finance"
            className="bg-white/90 backdrop-blur-xs border border-[#e8ddd2] rounded-[24px] p-6 sm:p-7 min-h-[245px] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[16px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1f1b18] mb-2">
                Finance
              </h3>
              <p className="text-sm text-[#756b63] leading-relaxed">
                Track income, expenses, spending patterns, and financial health with zero visual overwhelm.
              </p>
            </div>
            <div className="pt-4 mt-auto">
              <span className="text-xs font-semibold text-[#7b4a27] inline-flex items-center gap-1">
                Income &amp; Expense Tracking
              </span>
            </div>
          </div>

          {/* Feature 3: AI Insights */}
          <div
            id="landing-card-ai"
            className="bg-white/90 backdrop-blur-xs border border-[#e8ddd2] rounded-[24px] p-6 sm:p-7 min-h-[245px] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[16px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1f1b18] mb-2">
                AI Insights
              </h3>
              <p className="text-sm text-[#756b63] leading-relaxed">
                Ask NIVORA AI to understand your journal reflections and financial patterns with tailored intelligence.
              </p>
            </div>
            <div className="pt-4 mt-auto">
              <span className="text-xs font-semibold text-[#7b4a27] inline-flex items-center gap-1">
                Personalized Correlations
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Privacy note */}
      <footer className="py-6 border-t border-[#e8ddd2] flex flex-col sm:flex-row items-center justify-between text-xs text-[#756b63] gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#7b4a27]" />
          <span>Strict User-Isolated Cloud Storage. Never shared across accounts.</span>
        </div>
        <div>
          <span>NIVORA Intelligence Platform</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
};

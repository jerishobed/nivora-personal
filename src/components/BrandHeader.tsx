import React from 'react';

interface BrandHeaderProps {
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  compact = false,
  className = '',
  onClick
}) => {
  if (compact) {
    return (
      <div
        id="nivora-brand-compact"
        onClick={onClick}
        className={`inline-flex items-center gap-3 cursor-pointer select-none group ${className}`}
      >
        <div className="w-10 h-10 rounded-[14px] bg-[#7b4a27] text-white flex items-center justify-center font-bold text-xl shadow-sm transition-transform duration-200 group-hover:scale-105">
          N
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1f1b18]">
            NIVORA
          </h1>
          <p className="text-xs text-[#756b63] hidden sm:block">
            Personal Intelligence
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="nivora-brand-header" className={`text-center select-none ${className}`}>
      <div className="inline-flex items-center justify-center gap-3.5 mb-2.5">
        <div className="w-12 h-12 rounded-[16px] bg-[#7b4a27] text-white flex items-center justify-center font-bold text-2xl shadow-md">
          N
        </div>
        <h1 className="text-4xl sm:text-[42px] font-extrabold tracking-tight text-[#1f1b18]">
          NIVORA
        </h1>
      </div>
      <p className="text-sm sm:text-base text-[#756b63] max-w-md mx-auto font-normal">
        Personal Journal, Finance Intelligence &amp; AI Insights
      </p>
    </div>
  );
};

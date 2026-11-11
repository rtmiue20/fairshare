import React from 'react';

interface FairShareLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const FairShareLogo: React.FC<FairShareLogoProps> = ({
  size = 22,
  showText = true,
  className = '',
  textClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Geometric Mark - 100% synced with favicon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="logoCyanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="logoIndigoViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#2563eb" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Base Squircle Tile */}
        <rect width="32" height="32" rx="7.5" fill="url(#logoBg)" />
        <rect width="32" height="32" rx="7.5" fill="none" stroke="#27272a" strokeWidth="0.8" />

        {/* Top-Right Quadrant (Violet/Indigo) */}
        <rect
          x="12.5"
          y="6.5"
          width="13"
          height="13"
          rx="3.2"
          stroke="url(#logoIndigoViolet)"
          strokeWidth="2.2"
          fill="#1e1b4b"
          fillOpacity="0.4"
        />

        {/* Bottom-Left Quadrant (Cyan/Electric Blue) */}
        <rect
          x="6.5"
          y="12.5"
          width="13"
          height="13"
          rx="3.2"
          stroke="url(#logoCyanBlue)"
          strokeWidth="2.2"
          fill="#0f172a"
          fillOpacity="0.75"
          filter="url(#logoGlow)"
        />

        {/* Center Consensus Core */}
        <circle cx="16" cy="16" r="2.2" fill="#38bdf8" />
        <circle cx="16" cy="16" r="1.1" fill="#ffffff" />
      </svg>

      {/* Brand Text */}
      {showText && (
        <span
          className={`tracking-wider font-semibold text-zinc-100 ${textClassName}`}
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: `${Math.max(13, size * 0.68)}px`,
            letterSpacing: '0.06em',
          }}
        >
          FAIRSHARE
        </span>
      )}
    </div>
  );
};


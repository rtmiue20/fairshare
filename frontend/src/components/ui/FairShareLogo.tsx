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
      {/* FairShare Logo: Two overlapping rounded squares (Bottom-Left Blue, Top-Right Gray) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-hidden="true"
      >
        {/* Top-Right Quadrant (Cool Gray frame) */}
        <rect
          x="7.5"
          y="2.5"
          width="13.5"
          height="13.5"
          rx="2.2"
          fill="none"
          stroke="var(--fg3, #94a3b8)"
          strokeWidth="1.9"
        />

        {/* Bottom-Left Quadrant (Electric Blue frame) */}
        <rect
          x="2.5"
          y="7.5"
          width="13.5"
          height="13.5"
          rx="2.2"
          fill="none"
          stroke="var(--accent, #2563eb)"
          strokeWidth="1.9"
        />
      </svg>

      {/* Brand Text: FAIRSHARE - Automatically switches between light & dark mode */}
      {showText && (
        <span
          className={`font-bold tracking-widest ${textClassName}`}
          style={{
            fontFamily: 'var(--f-display, var(--f-sans, system-ui, -apple-system, sans-serif))',
            fontSize: `${Math.max(13, size * 0.72)}px`,
            letterSpacing: '0.18em',
            fontWeight: 700,
            color: 'var(--fg)',
            margin: 0,
            lineHeight: 1,
            display: 'inline-block',
          }}
        >
          FAIRSHARE
        </span>
      )}
    </div>
  );
};

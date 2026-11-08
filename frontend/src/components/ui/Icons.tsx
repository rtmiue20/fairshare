import React from 'react';

export type IconName =
  | 'plug'
  | 'chart'
  | 'vote'
  | 'bell'
  | 'file'
  | 'set'
  | 'moon'
  | 'sun';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
}

export const FairShareIcon: React.FC<IconProps> = ({
  name,
  className = 'i',
  ...props
}) => {
  switch (name) {
    case 'plug':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'vote':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M7 7h11l-3-3M17 17H6l3 3" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />
        </svg>
      );
    case 'file':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />
        </svg>
      );
    case 'set':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      );
    case 'moon':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
        </svg>
      );
    case 'sun':
      return (
        <svg className={`i ${className}`} viewBox="0 0 24 24" {...props}>
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
};

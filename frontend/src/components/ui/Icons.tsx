import React from 'react';
import {
  Plug,
  BarChart3,
  Vote,
  Bell,
  FileText,
  Settings,
  Moon,
  Sun,
  type LucideProps,
} from 'lucide-react';

export type IconName =
  | 'plug'
  | 'chart'
  | 'vote'
  | 'bell'
  | 'file'
  | 'set'
  | 'moon'
  | 'sun';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  className?: string;
  size?: number | string;
}

export const FairShareIcon: React.FC<IconProps> = ({
  name,
  className = 'i',
  size = 18,
  ...props
}) => {
  switch (name) {
    case 'plug':
      return <Plug className={className} size={size} {...props} />;
    case 'chart':
      return <BarChart3 className={className} size={size} {...props} />;
    case 'vote':
      return <Vote className={className} size={size} {...props} />;
    case 'bell':
      return <Bell className={className} size={size} {...props} />;
    case 'file':
      return <FileText className={className} size={size} {...props} />;
    case 'set':
      return <Settings className={className} size={size} {...props} />;
    case 'moon':
      return <Moon className={className} size={size} {...props} />;
    case 'sun':
      return <Sun className={className} size={size} {...props} />;
    default:
      return null;
  }
};

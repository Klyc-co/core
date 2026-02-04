interface NutshellIconProps {
  className?: string;
}

const NutshellIcon = ({ className }: NutshellIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F7931A"/>
    <ellipse cx="12" cy="12" rx="5" ry="6" fill="white"/>
    <ellipse cx="12" cy="12" rx="2" ry="3" fill="#F7931A"/>
  </svg>
);

export default NutshellIcon;

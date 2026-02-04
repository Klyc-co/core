interface MilanoteIconProps {
  className?: string;
}

const MilanoteIcon = ({ className }: MilanoteIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F97316"/>
    <rect x="6" y="6" width="5" height="5" rx="1" fill="white"/>
    <rect x="13" y="6" width="5" height="5" rx="1" fill="white"/>
    <rect x="6" y="13" width="5" height="5" rx="1" fill="white"/>
    <rect x="13" y="13" width="5" height="5" rx="1" fill="white"/>
  </svg>
);

export default MilanoteIcon;

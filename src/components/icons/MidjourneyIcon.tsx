interface MidjourneyIconProps {
  className?: string;
}

const MidjourneyIcon = ({ className }: MidjourneyIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <path d="M12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export default MidjourneyIcon;

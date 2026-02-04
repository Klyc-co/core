interface SamCartIconProps {
  className?: string;
}

const SamCartIcon = ({ className }: SamCartIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#3B82F6"/>
    <circle cx="10" cy="17" r="1.5" fill="white"/>
    <circle cx="16" cy="17" r="1.5" fill="white"/>
    <path d="M5 6H7L9 14H17L19 8H8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default SamCartIcon;

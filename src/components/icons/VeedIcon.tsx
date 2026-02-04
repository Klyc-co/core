interface VeedIconProps {
  className?: string;
}

const VeedIcon = ({ className }: VeedIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#6366F1"/>
    <path d="M8 8L12 16L16 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default VeedIcon;

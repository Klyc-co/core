interface StreamYardIconProps {
  className?: string;
}

const StreamYardIcon = ({ className }: StreamYardIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#28A745"/>
    <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export default StreamYardIcon;

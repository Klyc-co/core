interface DaVinciResolveIconProps {
  className?: string;
}

const DaVinciResolveIcon = ({ className }: DaVinciResolveIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#232323"/>
    <circle cx="12" cy="12" r="6" stroke="#FF6B35" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="#FF6B35"/>
  </svg>
);

export default DaVinciResolveIcon;

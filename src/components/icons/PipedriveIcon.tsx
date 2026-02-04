interface PipedriveIconProps {
  className?: string;
}

const PipedriveIcon = ({ className }: PipedriveIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#1A1A1A"/>
    <circle cx="12" cy="12" r="6" stroke="#21C27E" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="#21C27E"/>
  </svg>
);

export default PipedriveIcon;

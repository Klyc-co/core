interface InforIconProps {
  className?: string;
}

const InforIcon = ({ className }: InforIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#007BC3"/>
    <circle cx="12" cy="8" r="2" fill="white"/>
    <rect x="10" y="11" width="4" height="7" rx="1" fill="white"/>
  </svg>
);

export default InforIcon;

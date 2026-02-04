interface BeRealIconProps {
  className?: string;
}

const BeRealIcon = ({ className }: BeRealIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <circle cx="8" cy="12" r="4" stroke="white" strokeWidth="1.5"/>
    <circle cx="16" cy="12" r="4" stroke="white" strokeWidth="1.5"/>
  </svg>
);

export default BeRealIcon;

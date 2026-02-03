interface PatreonIconProps {
  className?: string;
}

const PatreonIcon = ({ className }: PatreonIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="4" y="4" width="3" height="16" fill="#052D49"/>
    <circle cx="14" cy="10" r="6" fill="#F96854"/>
  </svg>
);

export default PatreonIcon;

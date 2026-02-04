interface RestreamIconProps {
  className?: string;
}

const RestreamIcon = ({ className }: RestreamIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F12B24"/>
    <path d="M8 8L16 12L8 16V8Z" fill="white"/>
  </svg>
);

export default RestreamIcon;

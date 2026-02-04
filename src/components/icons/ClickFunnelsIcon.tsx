interface ClickFunnelsIconProps {
  className?: string;
}

const ClickFunnelsIcon = ({ className }: ClickFunnelsIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#EC4D36"/>
    <path d="M6 6H18L16 10H8L6 6Z" fill="white"/>
    <path d="M8 10H16L14 14H10L8 10Z" fill="white"/>
    <path d="M10 14H14L12 18L10 14Z" fill="white"/>
  </svg>
);

export default ClickFunnelsIcon;

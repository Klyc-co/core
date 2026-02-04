interface ZoomIconProps {
  className?: string;
}

const ZoomIcon = ({ className }: ZoomIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#2D8CFF"/>
    <rect x="5" y="8" width="10" height="8" rx="1" fill="white"/>
    <path d="M15 10L19 8V16L15 14V10Z" fill="white"/>
  </svg>
);

export default ZoomIcon;

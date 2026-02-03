interface FrameioIconProps {
  className?: string;
}

const FrameioIcon = ({ className }: FrameioIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#7B68EE"/>
    <path d="M8 8H16V10H8V8Z" fill="white"/>
    <path d="M8 11H14V13H8V11Z" fill="white"/>
    <path d="M8 14H12V16H8V14Z" fill="white"/>
  </svg>
);

export default FrameioIcon;

interface ElevenLabsIconProps {
  className?: string;
}

const ElevenLabsIcon = ({ className }: ElevenLabsIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect x="8" y="4" width="3" height="16" rx="1.5" />
    <rect x="13" y="4" width="3" height="16" rx="1.5" />
  </svg>
);

export default ElevenLabsIcon;

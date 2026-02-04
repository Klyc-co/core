interface ZapierIconProps {
  className?: string;
}

const ZapierIcon = ({ className }: ZapierIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF4A00"/>
    <path d="M12 6L14.5 11H9.5L12 6Z" fill="white"/>
    <path d="M12 18L9.5 13H14.5L12 18Z" fill="white"/>
    <path d="M6 12L11 9.5V14.5L6 12Z" fill="white"/>
    <path d="M18 12L13 14.5V9.5L18 12Z" fill="white"/>
  </svg>
);

export default ZapierIcon;

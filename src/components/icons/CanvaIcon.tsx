interface CanvaIconProps {
  className?: string;
}

const CanvaIcon = ({ className }: CanvaIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#20C4CB" />
    <circle cx="12" cy="12" r="4" fill="white" />
  </svg>
);

export default CanvaIcon;

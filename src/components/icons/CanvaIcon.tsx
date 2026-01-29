interface CanvaIconProps {
  className?: string;
}

const CanvaIcon = ({ className }: CanvaIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#00C4CC" />
    <path 
      d="M12 6C8.686 6 6 8.686 6 12s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 9.5c-1.933 0-3.5-1.567-3.5-3.5S10.067 8.5 12 8.5s3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z" 
      fill="white"
    />
  </svg>
);

export default CanvaIcon;

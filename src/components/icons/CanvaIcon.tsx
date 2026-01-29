interface CanvaIconProps {
  className?: string;
}

const CanvaIcon = ({ className }: CanvaIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <defs>
      <linearGradient id="canvaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7D2AE7" />
        <stop offset="25%" stopColor="#00C4CC" />
        <stop offset="50%" stopColor="#23C7B6" />
        <stop offset="75%" stopColor="#4DD9CB" />
        <stop offset="100%" stopColor="#00C4CC" />
      </linearGradient>
    </defs>
    <path 
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" 
      fill="url(#canvaGradient)"
    />
    <path 
      d="M14.5 12c0 1.38-1.12 2.5-2.5 2.5S9.5 13.38 9.5 12s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5z" 
      fill="url(#canvaGradient)"
    />
  </svg>
);

export default CanvaIcon;

interface VideoleapIconProps {
  className?: string;
}

const VideoleapIcon = ({ className }: VideoleapIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#videoleap-gradient)" />
    <path 
      d="M9 8L16 12L9 16V8Z" 
      fill="white"
    />
    <defs>
      <linearGradient id="videoleap-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C3AED" />
        <stop offset="0.5" stopColor="#EC4899" />
        <stop offset="1" stopColor="#F97316" />
      </linearGradient>
    </defs>
  </svg>
);

export default VideoleapIcon;

interface BazaartIconProps {
  className?: string;
}

const BazaartIcon = ({ className }: BazaartIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#bazaart-gradient)" />
    <path 
      d="M7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17" 
      stroke="white" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="white" />
    <defs>
      <linearGradient id="bazaart-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B6B" />
        <stop offset="0.5" stopColor="#FF8E53" />
        <stop offset="1" stopColor="#FFC107" />
      </linearGradient>
    </defs>
  </svg>
);

export default BazaartIcon;

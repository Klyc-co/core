interface SynthesiaIconProps {
  className?: string;
}

const SynthesiaIcon = ({ className }: SynthesiaIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#synthesia-gradient)"/>
    <circle cx="12" cy="10" r="4" fill="white"/>
    <path d="M8 18C8 15.7909 9.79086 14 12 14C14.2091 14 16 15.7909 16 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="synthesia-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1"/>
        <stop offset="1" stopColor="#8B5CF6"/>
      </linearGradient>
    </defs>
  </svg>
);

export default SynthesiaIcon;

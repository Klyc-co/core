interface ClickUpIconProps {
  className?: string;
}

const ClickUpIcon = ({ className }: ClickUpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#clickup-gradient)"/>
    <path d="M7 14L12 9L17 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="clickup-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7B68EE"/>
        <stop offset="0.5" stopColor="#FF6B9D"/>
        <stop offset="1" stopColor="#FFC75F"/>
      </linearGradient>
    </defs>
  </svg>
);

export default ClickUpIcon;

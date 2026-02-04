interface HootsuiteIconProps {
  className?: string;
}

const HootsuiteIcon = ({ className }: HootsuiteIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#143059"/>
    <circle cx="9" cy="10" r="2" fill="white"/>
    <circle cx="15" cy="10" r="2" fill="white"/>
    <path d="M8 15C8 15 10 17 12 17C14 17 16 15 16 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default HootsuiteIcon;

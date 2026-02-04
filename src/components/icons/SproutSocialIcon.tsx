interface SproutSocialIconProps {
  className?: string;
}

const SproutSocialIcon = ({ className }: SproutSocialIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#59CB59"/>
    <circle cx="12" cy="14" r="4" fill="white"/>
    <path d="M12 10V6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 7L12 6L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default SproutSocialIcon;

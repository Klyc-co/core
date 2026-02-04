interface CopperIconProps {
  className?: string;
}

const CopperIcon = ({ className }: CopperIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F37046"/>
    <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
    <path d="M12 9V15M9 12H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default CopperIcon;

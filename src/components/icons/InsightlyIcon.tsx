interface InsightlyIconProps {
  className?: string;
}

const InsightlyIcon = ({ className }: InsightlyIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#5A67D8"/>
    <path d="M12 6L14.5 11H9.5L12 6Z" fill="white"/>
    <path d="M12 18L9.5 13H14.5L12 18Z" fill="white"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export default InsightlyIcon;

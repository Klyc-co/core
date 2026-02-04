interface AgileCRMIconProps {
  className?: string;
}

const AgileCRMIcon = ({ className }: AgileCRMIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#2196F3"/>
    <path d="M12 6L6 18H18L12 6Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="12" cy="14" r="2" fill="white"/>
  </svg>
);

export default AgileCRMIcon;

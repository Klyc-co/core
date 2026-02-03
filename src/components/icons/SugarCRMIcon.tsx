interface SugarCRMIconProps {
  className?: string;
}

const SugarCRMIcon = ({ className }: SugarCRMIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#E61E27"/>
    <path d="M7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12Z" stroke="white" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export default SugarCRMIcon;

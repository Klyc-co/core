interface FreshsalesIconProps {
  className?: string;
}

const FreshsalesIcon = ({ className }: FreshsalesIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F1583C"/>
    <circle cx="12" cy="10" r="3" fill="white"/>
    <path d="M7 17C7 14.2386 9.23858 12 12 12C14.7614 12 17 14.2386 17 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default FreshsalesIcon;

interface BoxIconProps {
  className?: string;
}

const BoxIcon = ({ className }: BoxIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0061D5"/>
    <path d="M7 10L12 14L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 14L12 18L17 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default BoxIcon;

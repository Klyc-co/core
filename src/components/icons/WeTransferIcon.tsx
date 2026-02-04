interface WeTransferIconProps {
  className?: string;
}

const WeTransferIcon = ({ className }: WeTransferIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#409FFF"/>
    <path d="M6 12L10 16L18 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default WeTransferIcon;

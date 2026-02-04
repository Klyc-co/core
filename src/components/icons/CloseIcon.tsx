interface CloseIconProps {
  className?: string;
}

const CloseIcon = ({ className }: CloseIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#3399FF"/>
    <path d="M7 7L17 17M17 7L7 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default CloseIcon;

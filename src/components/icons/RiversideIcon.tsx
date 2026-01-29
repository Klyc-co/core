interface RiversideIconProps {
  className?: string;
}

const RiversideIcon = ({ className }: RiversideIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF5A36" />
    <path 
      d="M7 7H11C13.2 7 15 8.8 15 11C15 12.5 14.1 13.8 12.8 14.4L15 17H12L10 14.5H9V17H7V7ZM9 9V12.5H11C12 12.5 12.8 11.8 12.8 11C12.8 10.1 12 9 11 9H9Z" 
      fill="white"
    />
  </svg>
);

export default RiversideIcon;

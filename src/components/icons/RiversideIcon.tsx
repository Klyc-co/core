interface RiversideIconProps {
  className?: string;
}

const RiversideIcon = ({ className }: RiversideIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#6366F1" />
    <path 
      d="M8 9.5C8 8.67 8.67 8 9.5 8H11V16H9.5C8.67 16 8 15.33 8 14.5V9.5Z" 
      fill="white"
    />
    <circle cx="14.5" cy="12" r="2.5" fill="white" />
  </svg>
);

export default RiversideIcon;

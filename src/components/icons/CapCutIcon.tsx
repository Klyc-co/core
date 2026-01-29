interface CapCutIconProps {
  className?: string;
}

const CapCutIcon = ({ className }: CapCutIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="black" />
    <path 
      d="M7 8.5C7 7.67 7.67 7 8.5 7H11L9 12L11 17H8.5C7.67 17 7 16.33 7 15.5V8.5Z" 
      fill="white"
    />
    <path 
      d="M12 7H15.5C16.33 7 17 7.67 17 8.5V15.5C17 16.33 16.33 17 15.5 17H12L14 12L12 7Z" 
      fill="white"
    />
  </svg>
);

export default CapCutIcon;

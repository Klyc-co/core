interface GoogleDriveIconProps {
  className?: string;
}

const GoogleDriveIcon = ({ className }: GoogleDriveIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <path d="M8.5 2L15.5 2L22 14H15L8.5 2Z" fill="#FBBC04" />
    <path d="M2 14L5.5 21H18.5L15 14H2Z" fill="#4285F4" />
    <path d="M8.5 2L2 14L5.5 21L12 9L8.5 2Z" fill="#34A853" />
  </svg>
);

export default GoogleDriveIcon;

interface GooglePhotosIconProps {
  className?: string;
}

const GooglePhotosIcon = ({ className }: GooglePhotosIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 2C12 2 12 12 12 12H2C2 6.48 6.48 2 12 2Z" fill="#DB4437"/>
    <path d="M22 12C22 12 12 12 12 12V2C17.52 2 22 6.48 22 12Z" fill="#4285F4"/>
    <path d="M12 22C12 22 12 12 12 12H22C22 17.52 17.52 22 12 22Z" fill="#0F9D58"/>
    <path d="M2 12C2 12 12 12 12 12V22C6.48 22 2 17.52 2 12Z" fill="#F4B400"/>
  </svg>
);

export default GooglePhotosIcon;

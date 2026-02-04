interface GoogleDocsIconProps {
  className?: string;
}

const GoogleDocsIcon = ({ className }: GoogleDocsIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4 4.5C4 3.67157 4.67157 3 5.5 3H14L20 9V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5V4.5Z" fill="#4285F4"/>
    <path d="M14 3L20 9H15.5C14.6716 9 14 8.32843 14 7.5V3Z" fill="#A1C2FA"/>
    <rect x="7" y="12" width="10" height="1.5" fill="white"/>
    <rect x="7" y="15" width="10" height="1.5" fill="white"/>
    <rect x="7" y="18" width="6" height="1.5" fill="white"/>
  </svg>
);

export default GoogleDocsIcon;

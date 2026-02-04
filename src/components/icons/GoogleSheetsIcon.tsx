interface GoogleSheetsIconProps {
  className?: string;
}

const GoogleSheetsIcon = ({ className }: GoogleSheetsIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4 4.5C4 3.67157 4.67157 3 5.5 3H14L20 9V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5V4.5Z" fill="#0F9D58"/>
    <path d="M14 3L20 9H15.5C14.6716 9 14 8.32843 14 7.5V3Z" fill="#87CEAC"/>
    <rect x="7" y="11" width="10" height="2" fill="white"/>
    <rect x="7" y="14" width="10" height="2" fill="white"/>
    <rect x="7" y="17" width="6" height="2" fill="white"/>
    <rect x="11" y="11" width="2" height="8" fill="white"/>
  </svg>
);

export default GoogleSheetsIcon;

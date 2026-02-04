interface MicrosoftTeamsIconProps {
  className?: string;
}

const MicrosoftTeamsIcon = ({ className }: MicrosoftTeamsIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#6264A7"/>
    <circle cx="16" cy="8" r="3" fill="white"/>
    <path d="M13 19V13H19V19H13Z" fill="#7B83EB"/>
    <rect x="5" y="7" width="10" height="10" rx="1" fill="white"/>
    <text x="10" y="15" textAnchor="middle" fill="#6264A7" fontSize="6" fontWeight="bold" fontFamily="Arial">T</text>
  </svg>
);

export default MicrosoftTeamsIcon;

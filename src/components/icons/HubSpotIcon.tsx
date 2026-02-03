interface HubSpotIconProps {
  className?: string;
}

const HubSpotIcon = ({ className }: HubSpotIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="3" fill="#FF7A59"/>
    <circle cx="12" cy="5" r="2" fill="#FF7A59"/>
    <circle cx="12" cy="19" r="2" fill="#FF7A59"/>
    <circle cx="5" cy="12" r="2" fill="#FF7A59"/>
    <circle cx="19" cy="12" r="2" fill="#FF7A59"/>
    <path d="M12 7V9M12 15V17M9 12H7M17 12H15" stroke="#FF7A59" strokeWidth="1.5"/>
  </svg>
);

export default HubSpotIcon;

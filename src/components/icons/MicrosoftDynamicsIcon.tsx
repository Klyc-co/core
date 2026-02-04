interface MicrosoftDynamicsIconProps {
  className?: string;
}

const MicrosoftDynamicsIcon = ({ className }: MicrosoftDynamicsIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#002050"/>
    <path d="M6 6H11V11H6V6Z" fill="#F25022"/>
    <path d="M13 6H18V11H13V6Z" fill="#7FBA00"/>
    <path d="M6 13H11V18H6V13Z" fill="#00A4EF"/>
    <path d="M13 13H18V18H13V13Z" fill="#FFB900"/>
  </svg>
);

export default MicrosoftDynamicsIcon;

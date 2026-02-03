interface ZohoIconProps {
  className?: string;
}

const ZohoIcon = ({ className }: ZohoIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#C8202B"/>
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">Z</text>
  </svg>
);

export default ZohoIcon;

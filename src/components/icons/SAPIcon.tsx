interface SAPIconProps {
  className?: string;
}

const SAPIcon = ({ className }: SAPIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="6" width="20" height="12" rx="2" fill="#0FAAFF"/>
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">SAP</text>
  </svg>
);

export default SAPIcon;

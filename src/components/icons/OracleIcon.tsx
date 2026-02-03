interface OracleIconProps {
  className?: string;
}

const OracleIcon = ({ className }: OracleIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="7" width="20" height="10" rx="5" fill="#C74634"/>
    <text x="12" y="14.5" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="Arial">ORACLE</text>
  </svg>
);

export default OracleIcon;

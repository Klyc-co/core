interface DescriptIconProps {
  className?: string;
}

const DescriptIcon = ({ className }: DescriptIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#1A1A2E"/>
    <rect x="6" y="8" width="2" height="8" rx="1" fill="#00D4AA"/>
    <rect x="9" y="6" width="2" height="12" rx="1" fill="#00D4AA"/>
    <rect x="12" y="9" width="2" height="6" rx="1" fill="#00D4AA"/>
    <rect x="15" y="7" width="2" height="10" rx="1" fill="#00D4AA"/>
  </svg>
);

export default DescriptIcon;

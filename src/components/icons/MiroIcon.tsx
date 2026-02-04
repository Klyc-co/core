interface MiroIconProps {
  className?: string;
}

const MiroIcon = ({ className }: MiroIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FFD02F"/>
    <path d="M6 17L8 7L12 17L16 7L18 17" stroke="#050038" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default MiroIcon;

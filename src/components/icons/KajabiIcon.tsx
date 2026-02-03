interface KajabiIconProps {
  className?: string;
}

const KajabiIcon = ({ className }: KajabiIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#5856D6"/>
    <path d="M7 7V17M7 12L12 7M7 12L12 17M17 7V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default KajabiIcon;

interface RunwayMLIconProps {
  className?: string;
}

const RunwayMLIcon = ({ className }: RunwayMLIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <path d="M6 12H18M6 12L10 8M6 12L10 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default RunwayMLIcon;

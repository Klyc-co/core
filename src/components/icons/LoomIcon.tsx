interface LoomIconProps {
  className?: string;
}

const LoomIcon = ({ className }: LoomIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#625DF5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
    <path d="M12 4V8M12 16V20M4 12H8M16 12H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default LoomIcon;

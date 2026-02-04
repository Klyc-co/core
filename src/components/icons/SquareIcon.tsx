interface SquareIconProps {
  className?: string;
}

const SquareIcon = ({ className }: SquareIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
    <rect x="9" y="9" width="6" height="6" rx="1" fill="#000000"/>
  </svg>
);

export default SquareIcon;

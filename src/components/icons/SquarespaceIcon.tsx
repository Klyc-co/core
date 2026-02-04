interface SquarespaceIconProps {
  className?: string;
}

const SquarespaceIcon = ({ className }: SquarespaceIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <path d="M7 10L10 7L17 14L14 17L7 10Z" stroke="white" strokeWidth="1.5"/>
    <path d="M10 13L13 10L17 14L14 17L10 13Z" stroke="white" strokeWidth="1.5"/>
  </svg>
);

export default SquarespaceIcon;

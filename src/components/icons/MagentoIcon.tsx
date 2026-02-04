interface MagentoIconProps {
  className?: string;
}

const MagentoIcon = ({ className }: MagentoIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#F26322"/>
    <path d="M12 5L6 8V16L8 17V10L12 8L16 10V17L18 16V8L12 5Z" fill="white"/>
    <path d="M10 11V18L12 19L14 18V11L12 12L10 11Z" fill="white"/>
  </svg>
);

export default MagentoIcon;

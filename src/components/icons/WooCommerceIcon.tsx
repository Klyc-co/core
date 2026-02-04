interface WooCommerceIconProps {
  className?: string;
}

const WooCommerceIcon = ({ className }: WooCommerceIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#96588A"/>
    <ellipse cx="8" cy="12" rx="2" ry="3" fill="white"/>
    <ellipse cx="12" cy="12" rx="2" ry="3" fill="white"/>
    <ellipse cx="16" cy="12" rx="2" ry="3" fill="white"/>
  </svg>
);

export default WooCommerceIcon;

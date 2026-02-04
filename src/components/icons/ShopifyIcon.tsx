interface ShopifyIconProps {
  className?: string;
}

const ShopifyIcon = ({ className }: ShopifyIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#96BF48"/>
    <path d="M14 5C14 5 13 5.5 12 5.5C11 5.5 10 5 10 5L9 9H15L14 5Z" fill="white"/>
    <path d="M9 9L8 19H16L15 9H9Z" fill="white"/>
    <circle cx="12" cy="7" r="1" fill="#96BF48"/>
  </svg>
);

export default ShopifyIcon;

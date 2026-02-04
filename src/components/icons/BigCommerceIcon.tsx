interface BigCommerceIconProps {
  className?: string;
}

const BigCommerceIcon = ({ className }: BigCommerceIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#121118"/>
    <path d="M7 8H13L11 12H15L9 18L11 13H7L9 8" fill="white"/>
  </svg>
);

export default BigCommerceIcon;

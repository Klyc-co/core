interface StripeIconProps {
  className?: string;
}

const StripeIcon = ({ className }: StripeIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#635BFF"/>
    <path d="M11 8C9.5 8 8.5 8.8 8.5 10C8.5 12.5 13 11.5 13 13C13 13.6 12.3 14 11.5 14C10.3 14 9.5 13.5 9 13L8 14.5C8.7 15.2 10 15.5 11.5 15.5C13.3 15.5 14.5 14.5 14.5 13C14.5 10.3 10 11.3 10 9.8C10 9.3 10.5 9 11.2 9C12 9 12.8 9.3 13.3 9.7L14 8.3C13.3 7.8 12.2 7.5 11 8Z" fill="white"/>
  </svg>
);

export default StripeIcon;

interface WixIconProps {
  className?: string;
}

const WixIcon = ({ className }: WixIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0C6EFC"/>
    <path d="M5 10L8 15L11 10L14 15L17 10L19 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default WixIcon;

interface IFTTTIconProps {
  className?: string;
}

const IFTTTIcon = ({ className }: IFTTTIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
    <rect x="6" y="10" width="12" height="4" rx="2" fill="white"/>
  </svg>
);

export default IFTTTIcon;

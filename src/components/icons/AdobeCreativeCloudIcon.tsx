interface AdobeCreativeCloudIconProps {
  className?: string;
}

const AdobeCreativeCloudIcon = ({ className }: AdobeCreativeCloudIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF0000"/>
    <path d="M6 17L12 6L18 17H14L12 13L10 17H6Z" fill="white"/>
  </svg>
);

export default AdobeCreativeCloudIcon;

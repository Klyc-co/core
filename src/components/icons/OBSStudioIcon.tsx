interface OBSStudioIconProps {
  className?: string;
}

const OBSStudioIcon = ({ className }: OBSStudioIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="10" fill="#302E31"/>
    <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export default OBSStudioIcon;

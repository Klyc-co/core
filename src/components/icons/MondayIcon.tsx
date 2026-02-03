interface MondayIconProps {
  className?: string;
}

const MondayIcon = ({ className }: MondayIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="6" cy="12" r="3" fill="#FF3D57"/>
    <circle cx="12" cy="12" r="3" fill="#FFCB00"/>
    <circle cx="18" cy="12" r="3" fill="#00CA72"/>
  </svg>
);

export default MondayIcon;

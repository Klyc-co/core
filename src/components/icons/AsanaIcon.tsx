interface AsanaIconProps {
  className?: string;
}

const AsanaIcon = ({ className }: AsanaIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="6" r="4" fill="#F06A6A"/>
    <circle cx="6" cy="16" r="4" fill="#F06A6A"/>
    <circle cx="18" cy="16" r="4" fill="#F06A6A"/>
  </svg>
);

export default AsanaIcon;

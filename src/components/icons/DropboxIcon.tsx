interface DropboxIconProps {
  className?: string;
}

const DropboxIcon = ({ className }: DropboxIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M6 2L0 6L6 10L12 6L6 2Z" fill="#0061FF" />
    <path d="M18 2L12 6L18 10L24 6L18 2Z" fill="#0061FF" />
    <path d="M0 14L6 18L12 14L6 10L0 14Z" fill="#0061FF" />
    <path d="M18 10L12 14L18 18L24 14L18 10Z" fill="#0061FF" />
    <path d="M6 19.5L12 15.5L18 19.5L12 23.5L6 19.5Z" fill="#0061FF" />
  </svg>
);

export default DropboxIcon;

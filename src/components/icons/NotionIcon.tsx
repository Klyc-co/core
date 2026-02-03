interface NotionIconProps {
  className?: string;
}

const NotionIcon = ({ className }: NotionIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4 4.5C4 3.67157 4.67157 3 5.5 3H15.5L20 7.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5V4.5Z" fill="white" stroke="black" strokeWidth="1.5"/>
    <path d="M7 8H13M7 12H17M7 16H15" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default NotionIcon;

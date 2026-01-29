interface SlackIconProps {
  className?: string;
}

const SlackIcon = ({ className }: SlackIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    {/* Top left - blue */}
    <path d="M5.5 9.5A1.5 1.5 0 1 1 5.5 6.5H7V8A1.5 1.5 0 0 1 5.5 9.5Z" fill="#36C5F0" />
    <path d="M8.5 9.5A1.5 1.5 0 0 1 7 8V4.5a1.5 1.5 0 1 1 3 0V8A1.5 1.5 0 0 1 8.5 9.5Z" fill="#36C5F0" />
    
    {/* Top right - green */}
    <path d="M14.5 5.5A1.5 1.5 0 1 1 17.5 5.5V7H16A1.5 1.5 0 0 1 14.5 5.5Z" fill="#2EB67D" />
    <path d="M14.5 8.5A1.5 1.5 0 0 1 16 7H19.5a1.5 1.5 0 0 1 0 3H16A1.5 1.5 0 0 1 14.5 8.5Z" fill="#2EB67D" />
    
    {/* Bottom right - yellow */}
    <path d="M18.5 14.5A1.5 1.5 0 1 1 18.5 17.5H17V16A1.5 1.5 0 0 1 18.5 14.5Z" fill="#ECB22E" />
    <path d="M15.5 14.5A1.5 1.5 0 0 1 17 16V19.5a1.5 1.5 0 0 1-3 0V16A1.5 1.5 0 0 1 15.5 14.5Z" fill="#ECB22E" />
    
    {/* Bottom left - red */}
    <path d="M9.5 18.5A1.5 1.5 0 1 1 6.5 18.5V17H8A1.5 1.5 0 0 1 9.5 18.5Z" fill="#E01E5A" />
    <path d="M9.5 15.5A1.5 1.5 0 0 1 8 17H4.5a1.5 1.5 0 0 1 0-3H8A1.5 1.5 0 0 1 9.5 15.5Z" fill="#E01E5A" />
  </svg>
);

export default SlackIcon;

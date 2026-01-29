interface SlackIconProps {
  className?: string;
}

const SlackIcon = ({ className }: SlackIconProps) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <path d="M6 15a2 2 0 1 1 0-4h2v2a2 2 0 0 1-2 2z" fill="#E01E5A" />
    <path d="M9 15a2 2 0 0 1 2-2h2v6a2 2 0 1 1-4 0v-4z" fill="#E01E5A" />
    <path d="M15 6a2 2 0 1 1 4 0v2h-2a2 2 0 0 1-2-2z" fill="#2EB67D" />
    <path d="M15 9a2 2 0 0 1 2-2h2a2 2 0 1 1 0 4h-4V9z" fill="#2EB67D" />
    <path d="M18 15a2 2 0 1 1 0 4h-2v-2a2 2 0 0 1 2-2z" fill="#ECB22E" />
    <path d="M15 15a2 2 0 0 1-2 2H5a2 2 0 1 1 0-4h8a2 2 0 0 1 2 2z" fill="#ECB22E" />
    <path d="M9 18a2 2 0 1 1-4 0v-2h2a2 2 0 0 1 2 2z" fill="#36C5F0" />
    <path d="M9 15a2 2 0 0 1-2-2V5a2 2 0 1 1 4 0v10z" fill="#36C5F0" />
  </svg>
);

export default SlackIcon;

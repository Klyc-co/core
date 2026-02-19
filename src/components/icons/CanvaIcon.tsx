interface CanvaIconProps {
  className?: string;
}

const CanvaIcon = ({ className }: CanvaIconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="canva-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00C4CC" />
        <stop offset="50%" stopColor="#7B2FF7" />
        <stop offset="100%" stopColor="#7B2FF7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="url(#canva-gradient)" />
    <path
      d="M15.2 8.4C14.4 7.5 13.3 7 12 7c-2.8 0-5 2.2-5 5s2.2 5 5 5c1.3 0 2.5-.5 3.3-1.4.2-.2.3-.5.1-.7-.2-.2-.5-.2-.7 0-.6.7-1.6 1.1-2.7 1.1-2.2 0-4-1.8-4-4s1.8-4 4-4c1 0 2 .4 2.7 1.1.2.2.5.2.7 0 .2-.2.2-.5-.1-.7z"
      fill="white"
      stroke="white"
      strokeWidth="0.5"
    />
  </svg>
);

export default CanvaIcon;

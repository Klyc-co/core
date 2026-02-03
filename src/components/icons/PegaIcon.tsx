interface PegaIconProps {
  className?: string;
}

const PegaIcon = ({ className }: PegaIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0076CE"/>
    <path d="M8 7H14C15.6569 7 17 8.34315 17 10C17 11.6569 15.6569 13 14 13H10V17H8V7Z" fill="white"/>
    <path d="M10 9V11H13.5C14.0523 11 14.5 10.5523 14.5 10C14.5 9.44772 14.0523 9 13.5 9H10Z" fill="#0076CE"/>
  </svg>
);

export default PegaIcon;

interface TrelloIconProps {
  className?: string;
}

const TrelloIcon = ({ className }: TrelloIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#0052CC"/>
    <rect x="5" y="5" width="5" height="12" rx="1" fill="white"/>
    <rect x="12" y="5" width="5" height="8" rx="1" fill="white"/>
  </svg>
);

export default TrelloIcon;

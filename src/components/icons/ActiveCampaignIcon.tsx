interface ActiveCampaignIconProps {
  className?: string;
}

const ActiveCampaignIcon = ({ className }: ActiveCampaignIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#004CFF"/>
    <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default ActiveCampaignIcon;

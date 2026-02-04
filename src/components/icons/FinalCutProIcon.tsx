interface FinalCutProIconProps {
  className?: string;
}

const FinalCutProIcon = ({ className }: FinalCutProIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#555555"/>
    <path d="M7 12L11 8V16L7 12Z" fill="white"/>
    <path d="M13 12L17 8V16L13 12Z" fill="#A855F7"/>
  </svg>
);

export default FinalCutProIcon;

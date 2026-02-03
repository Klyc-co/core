interface AirtableIconProps {
  className?: string;
}

const AirtableIcon = ({ className }: AirtableIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M11.5 3L3 6.5V10L11.5 13.5L20 10V6.5L11.5 3Z" fill="#FCB400"/>
    <path d="M12.5 13.5L21 10V17.5L12.5 21V13.5Z" fill="#18BFFF"/>
    <path d="M11.5 13.5L3 10V17.5L11.5 21V13.5Z" fill="#F82B60"/>
    <path d="M11.5 13.5V21L12.5 21V13.5L11.5 13.5Z" fill="#666"/>
  </svg>
);

export default AirtableIcon;

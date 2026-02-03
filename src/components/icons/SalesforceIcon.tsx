interface SalesforceIconProps {
  className?: string;
}

const SalesforceIcon = ({ className }: SalesforceIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M10 5C7.5 5 5.5 7 5.5 9.5C5.5 9.7 5.5 9.9 5.6 10.1C4.1 10.6 3 12 3 13.7C3 15.8 4.7 17.5 6.8 17.5H17.2C19.3 17.5 21 15.8 21 13.7C21 12 19.9 10.5 18.4 10.1C18.5 9.9 18.5 9.7 18.5 9.5C18.5 7 16.5 5 14 5C13 5 12.1 5.4 11.4 6C10.9 5.4 10.5 5 10 5Z" fill="#00A1E0"/>
  </svg>
);

export default SalesforceIcon;

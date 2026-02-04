interface GoogleCalendarIconProps {
  className?: string;
}

const GoogleCalendarIcon = ({ className }: GoogleCalendarIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="3" y="4" width="18" height="17" rx="2" fill="white" stroke="#4285F4" strokeWidth="2"/>
    <rect x="3" y="4" width="18" height="4" fill="#4285F4"/>
    <rect x="6" y="2" width="2" height="4" rx="1" fill="#4285F4"/>
    <rect x="16" y="2" width="2" height="4" rx="1" fill="#4285F4"/>
    <rect x="7" y="11" width="3" height="3" fill="#EA4335"/>
    <rect x="11" y="11" width="3" height="3" fill="#FBBC05"/>
    <rect x="7" y="15" width="3" height="3" fill="#34A853"/>
    <rect x="11" y="15" width="3" height="3" fill="#4285F4"/>
  </svg>
);

export default GoogleCalendarIcon;

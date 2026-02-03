interface OneDriveIconProps {
  className?: string;
}

const OneDriveIcon = ({ className }: OneDriveIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M9 17H18C20.2091 17 22 15.2091 22 13C22 11.1368 20.7252 9.57006 19 9.12602C19 6.36461 16.6354 4 13.5 4C11.0324 4 8.95946 5.41758 8.22302 7.43478C5.31693 7.85971 3 10.3469 3 13.5C3 16.5376 5.46243 19 8.5 19" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 15C4.89543 15 4 14.1046 4 13C4 11.3431 5.34315 10 7 10C7.35064 10 7.68722 10.0602 8 10.1707" stroke="#0078D4" strokeWidth="2"/>
  </svg>
);

export default OneDriveIcon;

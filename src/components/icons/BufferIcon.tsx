interface BufferIconProps {
  className?: string;
}

const BufferIcon = ({ className }: BufferIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#231F20"/>
    <path d="M3 12L12 17L21 12" stroke="#231F20" strokeWidth="2"/>
    <path d="M3 17L12 22L21 17" stroke="#231F20" strokeWidth="2"/>
  </svg>
);

export default BufferIcon;

import canvaLogo from "@/assets/canva-logo.png";

interface CanvaIconProps {
  className?: string;
}

const CanvaIcon = ({ className }: CanvaIconProps) => (
  <img src={canvaLogo} alt="Canva" className={className} style={{ borderRadius: '20%' }} />
);

export default CanvaIcon;

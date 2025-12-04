import { Link } from "react-router-dom";
import klycLogo from "@/assets/klyc-logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizes = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  };

  return (
    <Link to="/home" className={`flex items-center ${className}`}>
      <img 
        src={klycLogo} 
        alt="Klyc" 
        className={`${sizes[size]} w-auto object-contain`}
      />
    </Link>
  );
};

export default Logo;

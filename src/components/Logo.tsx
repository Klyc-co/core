import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import klycLogo from "@/assets/klyc-logo-transparent.png";
import klycLogoDark from "@/assets/klyc-logo-dark.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  to?: string;
}

const Logo = ({ className = "", size = "md", to = "/home" }: LogoProps) => {
  const { theme } = useTheme();
  
  const sizes = {
    sm: "h-16",
    md: "h-24",
    lg: "h-28",
  };

  const logoSrc = theme === "dark" ? klycLogoDark : klycLogo;

  return (
    <Link to={to} className={`flex items-center ${className}`}>
      <img 
        src={logoSrc} 
        alt="Klyc" 
        className={`${sizes[size]} w-auto object-contain`}
      />
    </Link>
  );
};

export default Logo;

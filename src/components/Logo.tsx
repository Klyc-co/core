import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import klycLogo from "@/assets/klyc-logo-transparent.png";
import klycLogoDark from "@/assets/klyc-logo-dark-transparent.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  to?: string;
}

const Logo = ({ className = "", size = "md", to = "/home" }: LogoProps) => {
  const { theme } = useTheme();
  
  const sizes = {
    sm: "h-12",
    md: "h-20",
    lg: "h-24",
  };

  const logoSrc = theme === "dark" ? klycLogoDark : klycLogo;

  return (
    <Link to={to} className={`flex items-center ${className}`}>
      <img 
        src={logoSrc} 
        alt="Klyc" 
        className={`${sizes[size]} w-auto max-w-[120px] sm:max-w-[160px] object-contain`}
      />
    </Link>
  );
};

export default Logo;

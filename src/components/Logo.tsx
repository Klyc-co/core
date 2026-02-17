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
    sm: "h-14",
    md: "h-24",
    lg: "h-28",
  };

  const logoSrc = theme === "dark" ? klycLogoDark : klycLogo;
  const isDark = theme === "dark";

  return (
    <Link to={to} className={`flex items-center ${className}`}>
      <img 
        src={logoSrc} 
        alt="Klyc" 
        className={`${sizes[size]} w-auto object-contain ${isDark ? "max-w-[80px] sm:max-w-[100px]" : ""}`}
      />
    </Link>
  );
};

export default Logo;

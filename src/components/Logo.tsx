import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizes = {
    sm: { height: 24, text: "text-lg" },
    md: { height: 32, text: "text-xl" },
    lg: { height: 40, text: "text-2xl" },
  };

  const { height, text } = sizes[size];

  return (
    <Link to="/dashboard" className={`flex items-center gap-1.5 ${className}`}>
      {/* Colorful orbs */}
      <svg
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Purple orb - top left */}
        <circle cx="10" cy="10" r="8" fill="url(#purple-gradient)" />
        {/* Teal orb - bottom right */}
        <circle cx="22" cy="18" r="7" fill="url(#teal-gradient)" />
        {/* Pink orb - middle */}
        <circle cx="14" cy="22" r="6" fill="url(#pink-gradient)" />
        
        <defs>
          <radialGradient id="purple-gradient" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
          <radialGradient id="teal-gradient" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </radialGradient>
          <radialGradient id="pink-gradient" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Text */}
      <span className={`font-bold text-foreground ${text}`}>
        Klyc
      </span>
    </Link>
  );
};

export default Logo;

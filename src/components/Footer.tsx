import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full py-6 mt-auto">
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <Link 
          to="/terms" 
          className="hover:text-foreground transition-colors"
        >
          Terms of Service
        </Link>
        <span className="text-border">|</span>
        <Link 
          to="/privacy" 
          className="hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;

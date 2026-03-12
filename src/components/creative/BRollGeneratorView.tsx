import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface BRollGeneratorViewProps {
  onBack: () => void;
}

/**
 * Wrapper that navigates to the existing /projects B-Roll editor
 * but provides a back-button to return to the Creative hub.
 * For now we simply redirect; the Projects page already has its own UI.
 */
const BRollGeneratorView = ({ onBack }: BRollGeneratorViewProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to the projects page which is the B-Roll editor
    navigate("/projects", { state: { fromCreative: true } });
  }, [navigate]);

  return null;
};

export default BRollGeneratorView;

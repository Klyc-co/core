import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialPostWizard from "@/components/social-post-editor/SocialPostWizard";

interface FlyerGeneratorViewProps {
  brandColors: string[];
  brandFonts: string[];
  onBack: () => void;
}

const FlyerGeneratorView = ({ brandColors, brandFonts, onBack }: FlyerGeneratorViewProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Flyer Generator</h2>
          <p className="text-sm text-muted-foreground">Design branded social posts and flyers with templates</p>
        </div>
      </div>
      <SocialPostWizard brandColors={brandColors} brandFonts={brandFonts} />
    </div>
  );
};

export default FlyerGeneratorView;

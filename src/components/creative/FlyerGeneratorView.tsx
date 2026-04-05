import SocialPostWizard from "@/components/social-post-editor/SocialPostWizard";

interface FlyerGeneratorViewProps {
  brandColors: string[];
  brandFonts: string[];
  onBack: () => void;
}

const FlyerGeneratorView = ({ brandColors, brandFonts }: FlyerGeneratorViewProps) => {
  return (
    <div>
      <SocialPostWizard brandColors={brandColors} brandFonts={brandFonts} />
    </div>
  );
};

export default FlyerGeneratorView;
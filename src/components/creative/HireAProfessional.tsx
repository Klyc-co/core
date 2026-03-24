import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCheck, Mail } from "lucide-react";
import ExampleAdsSection from "@/components/dashboard/ExampleAdsSection";
import AnimatedAdsSection from "@/components/dashboard/AnimatedAdsSection";

interface HireAProfessionalProps {
  onBack: () => void;
}

export default function HireAProfessional({ onBack }: HireAProfessionalProps) {
  const [showExamples, setShowExamples] = useState(false);

  if (showExamples) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowExamples(false)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <ExampleAdsSection />
        <AnimatedAdsSection />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Back to Creative Hub
      </Button>

      <div className="max-w-2xl mx-auto text-center space-y-6 py-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(245,158,11,0.10)" }}
        >
          <UserCheck className="w-10 h-10" style={{ color: "#f59e0b" }} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Hire a Professional</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
            Let a KLYC team member create any kind of video ad for you — custom, high-quality creatives tailored to your brand and audience.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button size="lg" className="gap-2" onClick={() => window.location.href = "mailto:team@klyc.io?subject=Video%20Ad%20Request"}>
            <Mail className="h-4 w-4" />
            Contact the Team
          </Button>
          <Button variant="outline" size="lg" onClick={() => setShowExamples(true)}>
            See Example Ads
          </Button>
        </div>
      </div>
    </div>
  );
}

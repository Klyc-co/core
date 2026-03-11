import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import klycMascot from "@/assets/klyc-mascot-waving.png";

interface StepPasteWebsiteProps {
  onNext: (url: string) => void;
}

const StepPasteWebsite = ({ onNext }: StepPasteWebsiteProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onNext(url.trim());
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={klycMascot}
            alt="Klyc AI assistant"
            className="w-48 h-48 object-contain mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Let's build your profile automatically.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Paste in your website and Klyc will scan your business, auto-fill your profile, and organize your brand library.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm max-w-lg mx-auto">
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}>
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Please paste in your website so I can scan your business and fill out your profile automatically. This saves you from entering everything manually.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="pl-11 h-12 text-base"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={!url.trim()}>
              Scan Your Website
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StepPasteWebsite;

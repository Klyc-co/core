import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ArrowRight, User, Link } from "lucide-react";
import klycMascot from "@/assets/klyc-mascot-waving.png";

interface StepPasteWebsiteProps {
  onNext: (url: string, firstName: string, lastName: string) => void;
}

const StepPasteWebsite = ({ onNext }: StepPasteWebsiteProps) => {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleScanWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl.trim() && firstName.trim()) onNext(websiteUrl.trim(), firstName.trim(), lastName.trim());
  };

  const handleScanSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (socialUrl.trim() && firstName.trim()) onNext(socialUrl.trim(), firstName.trim(), lastName.trim());
  };

  const hasName = firstName.trim().length > 0;

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
            Paste in your website or social profile and Klyc will scan your business, auto-fill your profile, and organize your brand library.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm max-w-lg mx-auto">
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}>
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Tell me your name, then paste your website or social media profile so I can scan and build your profile automatically.
            </p>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="pl-11 h-12 text-base"
              />
            </div>
            <div>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Website input + button */}
          <form onSubmit={handleScanWebsite} className="space-y-3 mb-5">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="pl-11 h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={!hasName || !websiteUrl.trim()}>
              Scan Website
              <Globe className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social input + button */}
          <form onSubmit={handleScanSocial} className="space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-1">
              Don't have a website? Paste your social media profile instead
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-2">
              {["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "X"].map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-[11px] text-muted-foreground">{p}</span>
              ))}
            </div>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="url"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                placeholder="https://instagram.com/yourbrand"
                className="pl-11 h-12 text-base"
              />
            </div>
            <Button type="submit" variant="outline" className="w-full h-12 text-base font-semibold" disabled={!hasName || !socialUrl.trim()}>
              Scan Social Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StepPasteWebsite;

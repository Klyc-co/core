import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { saveBrainDocument } from "@/lib/clientBrain";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Check, Building2, Users, Mic, Swords, Package, Share2 } from "lucide-react";

const STEPS = [
  { label: "Brand Profile", icon: Building2 },
  { label: "Target Audience", icon: Users },
  { label: "Brand Voice", icon: Mic },
  { label: "Competitors", icon: Swords },
  { label: "Products", icon: Package },
  { label: "Social Platforms", icon: Share2 },
];

export default function ClientOnboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    brand: { companyDescription: "", productCategories: "", positioning: "" },
    audience: { targetAudience: "", demographics: "", painPoints: "" },
    voice: { tone: "", writingStyle: "", emojiUsage: "" },
    competitors: { mainCompetitors: "", differentiators: "" },
    products: { products: "", valueProps: "" },
    social: { platforms: "", handles: "" },
  });

  const update = (section: string, field: string, value: string) => {
    setData(prev => ({ ...prev, [section]: { ...prev[section as keyof typeof prev], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); return; }

      const clientId = user.id;

      await Promise.all([
        saveBrainDocument(clientId, "brand_profile", {
          companyDescription: data.brand.companyDescription,
          productCategories: data.brand.productCategories.split(",").map(s => s.trim()).filter(Boolean),
          positioning: data.brand.positioning,
        }),
        saveBrainDocument(clientId, "voice_profile", {
          tone: data.voice.tone,
          writingStyle: data.voice.writingStyle,
          emojiUsage: data.voice.emojiUsage,
        }),
        saveBrainDocument(clientId, "strategy_profile", {
          messagingPillars: data.competitors.differentiators.split(",").map(s => s.trim()).filter(Boolean),
          targetAudience: data.audience.targetAudience,
        }),
      ]);

      toast.success("Onboarding complete! Brain documents saved.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div><Label>Company Description</Label><Textarea value={data.brand.companyDescription} onChange={e => update("brand", "companyDescription", e.target.value)} placeholder="What does your company do?" /></div>
          <div><Label>Product Categories (comma separated)</Label><Input value={data.brand.productCategories} onChange={e => update("brand", "productCategories", e.target.value)} placeholder="SaaS, Marketing, Analytics" /></div>
          <div><Label>Market Positioning</Label><Textarea value={data.brand.positioning} onChange={e => update("brand", "positioning", e.target.value)} placeholder="How do you position yourself in the market?" /></div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div><Label>Target Audience</Label><Textarea value={data.audience.targetAudience} onChange={e => update("audience", "targetAudience", e.target.value)} placeholder="Who is your ideal customer?" /></div>
          <div><Label>Demographics</Label><Input value={data.audience.demographics} onChange={e => update("audience", "demographics", e.target.value)} placeholder="Age, location, income level" /></div>
          <div><Label>Pain Points</Label><Textarea value={data.audience.painPoints} onChange={e => update("audience", "painPoints", e.target.value)} placeholder="What problems do they face?" /></div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div><Label>Tone</Label><Input value={data.voice.tone} onChange={e => update("voice", "tone", e.target.value)} placeholder="Professional, casual, witty…" /></div>
          <div><Label>Writing Style</Label><Textarea value={data.voice.writingStyle} onChange={e => update("voice", "writingStyle", e.target.value)} placeholder="Short sentences, storytelling, data-driven…" /></div>
          <div><Label>Emoji Usage</Label><Input value={data.voice.emojiUsage} onChange={e => update("voice", "emojiUsage", e.target.value)} placeholder="Heavy, moderate, none" /></div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div><Label>Main Competitors</Label><Textarea value={data.competitors.mainCompetitors} onChange={e => update("competitors", "mainCompetitors", e.target.value)} placeholder="List your main competitors" /></div>
          <div><Label>Key Differentiators (comma separated)</Label><Input value={data.competitors.differentiators} onChange={e => update("competitors", "differentiators", e.target.value)} placeholder="Speed, price, quality" /></div>
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div><Label>Products / Services</Label><Textarea value={data.products.products} onChange={e => update("products", "products", e.target.value)} placeholder="List your main products or services" /></div>
          <div><Label>Value Propositions</Label><Textarea value={data.products.valueProps} onChange={e => update("products", "valueProps", e.target.value)} placeholder="What value do you deliver?" /></div>
        </div>
      );
      case 5: return (
        <div className="space-y-4">
          <div><Label>Active Platforms (comma separated)</Label><Input value={data.social.platforms} onChange={e => update("social", "platforms", e.target.value)} placeholder="Instagram, TikTok, LinkedIn" /></div>
          <div><Label>Social Handles</Label><Input value={data.social.handles} onChange={e => update("social", "handles", e.target.value)} placeholder="@yourbrand" /></div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Onboarding</h1>
        <p className="text-muted-foreground text-sm">Set up your brand profile in 6 steps</p>
      </div>

      <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <Badge key={i} variant={i === step ? "default" : i < step ? "secondary" : "outline"} className="cursor-pointer" onClick={() => setStep(i)}>
            <s.icon className="h-3 w-3 mr-1" />
            {s.label}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{STEPS[step].label}</CardTitle></CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            <Check className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Complete Onboarding"}
          </Button>
        )}
      </div>
    </div>
  );
}

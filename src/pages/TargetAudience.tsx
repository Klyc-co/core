import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight } from "lucide-react";

const audienceTypes = [
  "B2C - Individual Consumers",
  "B2B - Businesses",
  "B2B2C - Both",
  "Non-profit / NGO",
  "Government",
  "Other"
];

const purchaseFrequencies = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
  "One-time"
];

const TargetAudience = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    audienceType: "",
    mainAudienceSummary: "",
    secondaryAudiences: "",
    ageRange: [25],
    incomeLevel: "",
    femalePercent: "50",
    malePercent: "50",
    geographicFocus: "",
    coreValuesInterests: "",
    lifestyleSummary: "",
    purchaseFrequency: "",
    preferredChannels: "",
    commonObjections: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save to database
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Target Audience</h1>
        <p className="text-muted-foreground mb-8">Define who you want to reach with your marketing</p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="audienceType">Primary Audience Type *</Label>
            <Select value={formData.audienceType} onValueChange={(value) => setFormData({ ...formData, audienceType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select audience type" />
              </SelectTrigger>
              <SelectContent>
                {audienceTypes.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainAudienceSummary">Main Audience Summary *</Label>
            <Textarea
              id="mainAudienceSummary"
              placeholder="Describe your ideal customer profile"
              value={formData.mainAudienceSummary}
              onChange={(e) => setFormData({ ...formData, mainAudienceSummary: e.target.value })}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryAudiences">Secondary Audiences</Label>
            <Textarea
              id="secondaryAudiences"
              placeholder="e.g., Eco-conscious parents, Minimalist professionals (comma separated)"
              value={formData.secondaryAudiences}
              onChange={(e) => setFormData({ ...formData, secondaryAudiences: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Age Range</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={formData.ageRange}
                  onValueChange={(value) => setFormData({ ...formData, ageRange: value })}
                  max={80}
                  min={18}
                  step={1}
                  className="flex-1"
                />
                <span className="text-foreground font-medium w-8">{formData.ageRange[0]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeLevel">Income Level</Label>
              <Input
                id="incomeLevel"
                placeholder="e.g., $50,000 - $100,000"
                value={formData.incomeLevel}
                onChange={(e) => setFormData({ ...formData, incomeLevel: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="femalePercent">Female %</Label>
              <Input
                id="femalePercent"
                type="number"
                min="0"
                max="100"
                value={formData.femalePercent}
                onChange={(e) => setFormData({ ...formData, femalePercent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="malePercent">Male %</Label>
              <Input
                id="malePercent"
                type="number"
                min="0"
                max="100"
                value={formData.malePercent}
                onChange={(e) => setFormData({ ...formData, malePercent: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geographicFocus">Geographic Focus</Label>
            <Input
              id="geographicFocus"
              placeholder="e.g., North America, Global"
              value={formData.geographicFocus}
              onChange={(e) => setFormData({ ...formData, geographicFocus: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coreValuesInterests">Core Values & Interests</Label>
            <Textarea
              id="coreValuesInterests"
              placeholder="e.g., Sustainability, Ethical manufacturing, Minimalism (comma separated)"
              value={formData.coreValuesInterests}
              onChange={(e) => setFormData({ ...formData, coreValuesInterests: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifestyleSummary">Lifestyle Summary</Label>
            <Textarea
              id="lifestyleSummary"
              placeholder="Describe their lifestyle, habits, and preferences"
              value={formData.lifestyleSummary}
              onChange={(e) => setFormData({ ...formData, lifestyleSummary: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseFrequency">Purchase Frequency</Label>
            <Select value={formData.purchaseFrequency} onValueChange={(value) => setFormData({ ...formData, purchaseFrequency: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {purchaseFrequencies.map((freq) => (
                  <SelectItem key={freq} value={freq.toLowerCase()}>
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredChannels">Preferred Purchase Channels</Label>
            <Textarea
              id="preferredChannels"
              placeholder="e.g., Online Store, Instagram Shopping, Pop-up Events (comma separated)"
              value={formData.preferredChannels}
              onChange={(e) => setFormData({ ...formData, preferredChannels: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commonObjections">Common Objections</Label>
            <Textarea
              id="commonObjections"
              placeholder="What hesitations might they have about your product?"
              value={formData.commonObjections}
              onChange={(e) => setFormData({ ...formData, commonObjections: e.target.value })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/profile")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 gap-2">
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default TargetAudience;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";

const benefitFocuses = [
  "Cost Savings",
  "Time Savings",
  "Quality/Performance",
  "Convenience",
  "Status/Prestige",
  "Sustainability",
  "Health/Wellness",
  "Safety/Security",
  "Innovation",
  "Other"
];

const ValueProposition = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    corePromise: "",
    elevatorPitch: "",
    customerPainPoints: "",
    howWeSolveIt: "",
    benefitFocus: "",
    uniqueValueDrivers: "",
    proofPoints: ""
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Value Proposition</h1>
        <p className="text-muted-foreground mb-8">What makes your brand unique and why customers should choose you</p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="corePromise">Core Promise *</Label>
            <Textarea
              id="corePromise"
              placeholder="Your fundamental brand commitment to customers"
              value={formData.corePromise}
              onChange={(e) => setFormData({ ...formData, corePromise: e.target.value })}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="elevatorPitch">Elevator Pitch *</Label>
            <Textarea
              id="elevatorPitch"
              placeholder="A concise explanation of what you do and why it matters"
              value={formData.elevatorPitch}
              onChange={(e) => setFormData({ ...formData, elevatorPitch: e.target.value })}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPainPoints">Customer Pain Points</Label>
            <Textarea
              id="customerPainPoints"
              placeholder="e.g., Difficulty finding sustainable options, Limited style options (comma separated)"
              value={formData.customerPainPoints}
              onChange={(e) => setFormData({ ...formData, customerPainPoints: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="howWeSolveIt">How We Solve It</Label>
            <Textarea
              id="howWeSolveIt"
              placeholder="e.g., Curated collections that blend sustainability with current trends, Full supply chain transparency (comma separated)"
              value={formData.howWeSolveIt}
              onChange={(e) => setFormData({ ...formData, howWeSolveIt: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefitFocus">Benefit Focus</Label>
            <Select value={formData.benefitFocus} onValueChange={(value) => setFormData({ ...formData, benefitFocus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary benefit focus" />
              </SelectTrigger>
              <SelectContent>
                {benefitFocuses.map((focus) => (
                  <SelectItem key={focus} value={focus.toLowerCase()}>
                    {focus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uniqueValueDrivers">Unique Value Drivers</Label>
            <Textarea
              id="uniqueValueDrivers"
              placeholder="e.g., 85% Recycled Materials, Carbon Neutral Shipping, Lifetime Warranty (comma separated)"
              value={formData.uniqueValueDrivers}
              onChange={(e) => setFormData({ ...formData, uniqueValueDrivers: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofPoints">Proof Points / Social Proof</Label>
            <Textarea
              id="proofPoints"
              placeholder="e.g., Featured in Vogue's 'Top 10 Sustainable Brands', 50,000+ happy customers, 4.8★ average rating"
              value={formData.proofPoints}
              onChange={(e) => setFormData({ ...formData, proofPoints: e.target.value })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/profile")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 gap-2">
              Save & Complete
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ValueProposition;

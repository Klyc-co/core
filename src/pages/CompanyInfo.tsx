import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Fashion",
  "Entertainment",
  "Travel",
  "Other"
];

const CompanyInfo = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: "",
    website: "",
    shortDescription: "",
    industry: "",
    productCategory: "",
    geographyMarkets: "",
    marketingGoals: "",
    mainCompetitors: ""
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Company Information</h1>
        <p className="text-muted-foreground mb-8">Tell us about your business and market</p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              placeholder="e.g., EcoThreads"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="e.g., www.yourbusiness.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description *</Label>
            <Textarea
              id="shortDescription"
              placeholder="Describe your business and what you offer"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry *</Label>
            <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select an industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry.toLowerCase()}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productCategory">Product Category</Label>
            <Input
              id="productCategory"
              placeholder="e.g., Sustainable Fashion"
              value={formData.productCategory}
              onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="geographyMarkets">Geography/Markets</Label>
            <Input
              id="geographyMarkets"
              placeholder="e.g., North America, Global"
              value={formData.geographyMarkets}
              onChange={(e) => setFormData({ ...formData, geographyMarkets: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketingGoals">Marketing Goals</Label>
            <Textarea
              id="marketingGoals"
              placeholder="e.g., Brand Awareness, Lead Generation, Customer Retention (comma separated)"
              value={formData.marketingGoals}
              onChange={(e) => setFormData({ ...formData, marketingGoals: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainCompetitors">Main Competitors</Label>
            <Textarea
              id="mainCompetitors"
              placeholder="e.g., Competitor 1, Competitor 2 (comma separated)"
              value={formData.mainCompetitors}
              onChange={(e) => setFormData({ ...formData, mainCompetitors: e.target.value })}
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

export default CompanyInfo;

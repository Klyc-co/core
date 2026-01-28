import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Users, Lightbulb } from "lucide-react";

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

const CompanyInfo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("company");

  // Company Info state
  const [companyData, setCompanyData] = useState({
    businessName: "",
    website: "",
    shortDescription: "",
    industry: "",
    productCategory: "",
    geographyMarkets: "",
    marketingGoals: "",
    mainCompetitors: ""
  });

  // Target Audience state
  const [audienceData, setAudienceData] = useState({
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

  // Value Proposition state
  const [valueData, setValueData] = useState({
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
      <main className="max-w-3xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Business Profile</h1>
        <p className="text-muted-foreground mb-8">Tell us about your business, audience, and what makes you unique</p>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="w-4 h-4" />
                Company
              </TabsTrigger>
              <TabsTrigger value="audience" className="gap-2">
                <Users className="w-4 h-4" />
                Audience
              </TabsTrigger>
              <TabsTrigger value="value" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                Value Prop
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="company" className="bg-card border border-border rounded-xl p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., EcoThreads"
                  value={companyData.businessName}
                  onChange={(e) => setCompanyData({ ...companyData, businessName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="e.g., www.yourbusiness.com"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Describe your business and what you offer"
                  value={companyData.shortDescription}
                  onChange={(e) => setCompanyData({ ...companyData, shortDescription: e.target.value })}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={companyData.industry} onValueChange={(value) => setCompanyData({ ...companyData, industry: value })}>
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
                  value={companyData.productCategory}
                  onChange={(e) => setCompanyData({ ...companyData, productCategory: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="geographyMarkets">Geography/Markets</Label>
                <Input
                  id="geographyMarkets"
                  placeholder="e.g., North America, Global"
                  value={companyData.geographyMarkets}
                  onChange={(e) => setCompanyData({ ...companyData, geographyMarkets: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketingGoals">Marketing Goals</Label>
                <Textarea
                  id="marketingGoals"
                  placeholder="e.g., Brand Awareness, Lead Generation, Customer Retention (comma separated)"
                  value={companyData.marketingGoals}
                  onChange={(e) => setCompanyData({ ...companyData, marketingGoals: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainCompetitors">Main Competitors</Label>
                <Textarea
                  id="mainCompetitors"
                  placeholder="e.g., Competitor 1, Competitor 2 (comma separated)"
                  value={companyData.mainCompetitors}
                  onChange={(e) => setCompanyData({ ...companyData, mainCompetitors: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Target Audience Tab */}
            <TabsContent value="audience" className="bg-card border border-border rounded-xl p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="audienceType">Primary Audience Type *</Label>
                <Select value={audienceData.audienceType} onValueChange={(value) => setAudienceData({ ...audienceData, audienceType: value })}>
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
                  value={audienceData.mainAudienceSummary}
                  onChange={(e) => setAudienceData({ ...audienceData, mainAudienceSummary: e.target.value })}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryAudiences">Secondary Audiences</Label>
                <Textarea
                  id="secondaryAudiences"
                  placeholder="e.g., Eco-conscious parents, Minimalist professionals (comma separated)"
                  value={audienceData.secondaryAudiences}
                  onChange={(e) => setAudienceData({ ...audienceData, secondaryAudiences: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Age Range</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={audienceData.ageRange}
                      onValueChange={(value) => setAudienceData({ ...audienceData, ageRange: value })}
                      max={80}
                      min={18}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-foreground font-medium w-8">{audienceData.ageRange[0]}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incomeLevel">Income Level</Label>
                  <Input
                    id="incomeLevel"
                    placeholder="e.g., $50,000 - $100,000"
                    value={audienceData.incomeLevel}
                    onChange={(e) => setAudienceData({ ...audienceData, incomeLevel: e.target.value })}
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
                    value={audienceData.femalePercent}
                    onChange={(e) => setAudienceData({ ...audienceData, femalePercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="malePercent">Male %</Label>
                  <Input
                    id="malePercent"
                    type="number"
                    min="0"
                    max="100"
                    value={audienceData.malePercent}
                    onChange={(e) => setAudienceData({ ...audienceData, malePercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geographicFocus">Geographic Focus</Label>
                <Input
                  id="geographicFocus"
                  placeholder="e.g., North America, Global"
                  value={audienceData.geographicFocus}
                  onChange={(e) => setAudienceData({ ...audienceData, geographicFocus: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coreValuesInterests">Core Values & Interests</Label>
                <Textarea
                  id="coreValuesInterests"
                  placeholder="e.g., Sustainability, Ethical manufacturing, Minimalism (comma separated)"
                  value={audienceData.coreValuesInterests}
                  onChange={(e) => setAudienceData({ ...audienceData, coreValuesInterests: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifestyleSummary">Lifestyle Summary</Label>
                <Textarea
                  id="lifestyleSummary"
                  placeholder="Describe their lifestyle, habits, and preferences"
                  value={audienceData.lifestyleSummary}
                  onChange={(e) => setAudienceData({ ...audienceData, lifestyleSummary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseFrequency">Purchase Frequency</Label>
                <Select value={audienceData.purchaseFrequency} onValueChange={(value) => setAudienceData({ ...audienceData, purchaseFrequency: value })}>
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
                  value={audienceData.preferredChannels}
                  onChange={(e) => setAudienceData({ ...audienceData, preferredChannels: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commonObjections">Common Objections</Label>
                <Textarea
                  id="commonObjections"
                  placeholder="What hesitations might they have about your product?"
                  value={audienceData.commonObjections}
                  onChange={(e) => setAudienceData({ ...audienceData, commonObjections: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Value Proposition Tab */}
            <TabsContent value="value" className="bg-card border border-border rounded-xl p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="corePromise">Core Promise *</Label>
                <Textarea
                  id="corePromise"
                  placeholder="Your fundamental brand commitment to customers"
                  value={valueData.corePromise}
                  onChange={(e) => setValueData({ ...valueData, corePromise: e.target.value })}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="elevatorPitch">Elevator Pitch *</Label>
                <Textarea
                  id="elevatorPitch"
                  placeholder="A concise explanation of what you do and why it matters"
                  value={valueData.elevatorPitch}
                  onChange={(e) => setValueData({ ...valueData, elevatorPitch: e.target.value })}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPainPoints">Customer Pain Points</Label>
                <Textarea
                  id="customerPainPoints"
                  placeholder="e.g., Difficulty finding sustainable options, Limited style options (comma separated)"
                  value={valueData.customerPainPoints}
                  onChange={(e) => setValueData({ ...valueData, customerPainPoints: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="howWeSolveIt">How We Solve It</Label>
                <Textarea
                  id="howWeSolveIt"
                  placeholder="e.g., Curated collections that blend sustainability with current trends, Full supply chain transparency (comma separated)"
                  value={valueData.howWeSolveIt}
                  onChange={(e) => setValueData({ ...valueData, howWeSolveIt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefitFocus">Benefit Focus</Label>
                <Select value={valueData.benefitFocus} onValueChange={(value) => setValueData({ ...valueData, benefitFocus: value })}>
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
                  value={valueData.uniqueValueDrivers}
                  onChange={(e) => setValueData({ ...valueData, uniqueValueDrivers: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proofPoints">Proof Points / Social Proof</Label>
                <Textarea
                  id="proofPoints"
                  placeholder="e.g., Featured in Vogue's 'Top 10 Sustainable Brands', 50,000+ happy customers, 4.8★ average rating"
                  value={valueData.proofPoints}
                  onChange={(e) => setValueData({ ...valueData, proofPoints: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/profile")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
              Save Profile
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CompanyInfo;

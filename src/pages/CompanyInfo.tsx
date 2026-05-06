import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Users, Lightbulb, Loader2, Globe, TrendingUp, Upload, ImageIcon, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useClientContext } from "@/contexts/ClientContext";
import { WebsiteAnalyticsWidget } from "@/components/WebsiteAnalyticsWidget";
import { AnalyticsPlatformGrid } from "@/components/AnalyticsPlatformGrid";
import { useGoogleAnalyticsOAuthCallback } from "@/hooks/useGoogleAnalyticsOAuthCallback";

const industries = [
  "Technology", "Healthcare", "Finance", "E-commerce", "Education",
  "Real Estate", "Food & Beverage", "Fashion", "Entertainment", "Travel", "Other"
];

const audienceTypes = [
  "B2C - Individual Consumers", "B2B - Businesses", "B2B2C - Both",
  "Non-profit / NGO", "Government", "Other"
];

const purchaseFrequencies = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "One-time"];

const benefitFocuses = [
  "Cost Savings", "Time Savings", "Quality/Performance", "Convenience",
  "Status/Prestige", "Sustainability", "Health/Wellness", "Safety/Security", "Innovation", "Other"
];

const CompanyInfo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { getEffectiveUserId, selectedClientId, isDefaultClient } = useClientContext();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libraryImages, setLibraryImages] = useState<{ id: string; name: string; value: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger re-load when klyc-chat scans and populates the profile
  const [profileReloadTrigger, setProfileReloadTrigger] = useState(0);

  // Handle Google Analytics OAuth callback (works even when Analytics tab isn't active)
  // This is critical for popup OAuth flow - the popup lands on /profile/company
  // and this hook processes the callback, notifies opener, and closes the popup
  useGoogleAnalyticsOAuthCallback();

  // Company Info state
  const [companyData, setCompanyData] = useState({
    businessName: "", website: "", shortDescription: "", industry: "",
    productCategory: "", geographyMarkets: "", marketingGoals: "", mainCompetitors: ""
  });

  // Target Audience state
  const [audienceData, setAudienceData] = useState({
    audienceType: "", mainAudienceSummary: "", secondaryAudiences: "", ageRange: [25],
    incomeLevel: "", femalePercent: "50", malePercent: "50", geographicFocus: "",
    coreValuesInterests: "", lifestyleSummary: "", purchaseFrequency: "",
    preferredChannels: "", commonObjections: ""
  });

  // Value Proposition state
  const [valueData, setValueData] = useState({
    corePromise: "", elevatorPitch: "", customerPainPoints: "", howWeSolveIt: "",
    benefitFocus: "", uniqueValueDrivers: "", proofPoints: ""
  });

  // Load profile based on selected client
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setUser(user);
      
      // Get the effective user ID based on selected client
      const effectiveUserId = getEffectiveUserId();
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
      } else if (profile) {
        setCompanyData({
          businessName: profile.business_name || "",
          website: profile.website || "",
          shortDescription: profile.description || "",
          industry: profile.industry || "",
          productCategory: profile.product_category || "",
          geographyMarkets: profile.geography_markets || "",
          marketingGoals: profile.marketing_goals || "",
          mainCompetitors: profile.main_competitors || ""
        });
        setLogoUrl(profile.logo_url || null);

        const savedAudience = profile.audience_data as Record<string, unknown> || {};
        setAudienceData({
          audienceType: (savedAudience.audienceType as string) || "",
          mainAudienceSummary: profile.target_audience || (savedAudience.mainAudienceSummary as string) || "",
          secondaryAudiences: (savedAudience.secondaryAudiences as string) || "",
          ageRange: (savedAudience.ageRange as number[]) || [25],
          incomeLevel: (savedAudience.incomeLevel as string) || "",
          femalePercent: (savedAudience.femalePercent as string) || "50",
          malePercent: (savedAudience.malePercent as string) || "50",
          geographicFocus: (savedAudience.geographicFocus as string) || "",
          coreValuesInterests: (savedAudience.coreValuesInterests as string) || "",
          lifestyleSummary: (savedAudience.lifestyleSummary as string) || "",
          purchaseFrequency: (savedAudience.purchaseFrequency as string) || "",
          preferredChannels: (savedAudience.preferredChannels as string) || "",
          commonObjections: (savedAudience.commonObjections as string) || ""
        });

        const savedValue = profile.value_data as Record<string, unknown> || {};
        setValueData({
          corePromise: profile.value_proposition || (savedValue.corePromise as string) || "",
          elevatorPitch: (savedValue.elevatorPitch as string) || "",
          customerPainPoints: (savedValue.customerPainPoints as string) || "",
          howWeSolveIt: (savedValue.howWeSolveIt as string) || "",
          benefitFocus: (savedValue.benefitFocus as string) || "",
          uniqueValueDrivers: (savedValue.uniqueValueDrivers as string) || "",
          proofPoints: (savedValue.proofPoints as string) || ""
        });
      } else {
        // Clear form for new profile
        setCompanyData({
          businessName: "", website: "", shortDescription: "", industry: "",
          productCategory: "", geographyMarkets: "", marketingGoals: "", mainCompetitors: ""
        });
        setAudienceData({
          audienceType: "", mainAudienceSummary: "", secondaryAudiences: "", ageRange: [25],
          incomeLevel: "", femalePercent: "50", malePercent: "50", geographicFocus: "",
          coreValuesInterests: "", lifestyleSummary: "", purchaseFrequency: "",
          preferredChannels: "", commonObjections: ""
        });
        setValueData({
          corePromise: "", elevatorPitch: "", customerPainPoints: "", howWeSolveIt: "",
          benefitFocus: "", uniqueValueDrivers: "", proofPoints: ""
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate, selectedClientId, getEffectiveUserId, profileReloadTrigger]);

  // ── Listen for Klyc profile-fill events from SidebarChat ──────────────────
  useEffect(() => {
    const handleProfileUpdated = () => {
      toast.success("Klyc filled in your profile! Review the fields and click Save.");
      setProfileReloadTrigger((t) => t + 1);
    };
    window.addEventListener("klyc-profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("klyc-profile-updated", handleProfileUpdated);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to save");
      return;
    }

    // Get the effective user ID for saving
    const effectiveUserId = getEffectiveUserId();
    if (!effectiveUserId) {
      toast.error("No client selected");
      return;
    }

    // Check if marketer can save to client profile (only for default)
    if (!isDefaultClient) {
      toast.error("Only clients can edit their own profile. You can view but not edit client profiles.");
      return;
    }

    setSaving(true);

    const profileData = {
      user_id: effectiveUserId,
      business_name: companyData.businessName,
      website: companyData.website,
      description: companyData.shortDescription,
      industry: companyData.industry,
      product_category: companyData.productCategory,
      geography_markets: companyData.geographyMarkets,
      marketing_goals: companyData.marketingGoals,
      main_competitors: companyData.mainCompetitors,
      target_audience: audienceData.mainAudienceSummary,
      value_proposition: valueData.corePromise,
      audience_data: audienceData,
      value_data: valueData,
      logo_url: logoUrl,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("client_profiles")
      .upsert(profileData, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved successfully!");
      navigate("/profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Business Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Tell us about your business, audience, and import your brand sources</p>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="company" className="gap-2 text-xs sm:text-sm px-2">
                <Building2 className="w-4 h-4 hidden sm:block" />
                Company
              </TabsTrigger>
              <TabsTrigger value="audience" className="gap-2 text-xs sm:text-sm px-2">
                <Users className="w-4 h-4 hidden sm:block" />
                Audience
              </TabsTrigger>
              <TabsTrigger value="value" className="gap-2 text-xs sm:text-sm px-2">
                <Lightbulb className="w-4 h-4 hidden sm:block" />
                Value Prop
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2 text-xs sm:text-sm px-2">
                <Globe className="w-4 h-4 hidden sm:block" />
                Import
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 text-xs sm:text-sm px-2">
                <TrendingUp className="w-4 h-4 hidden sm:block" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="company" className="bg-card border border-border rounded-xl p-4 sm:p-8 space-y-6">
              {/* Profile Photo */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        setIsUploadingLogo(true);
                        const ext = file.name.split('.').pop();
                        const path = `${user.id}/profile-photo.${ext}`;
                        const { error: uploadErr } = await supabase.storage
                          .from('brand-assets')
                          .upload(path, file, { upsert: true });
                        if (uploadErr) {
                          toast.error("Failed to upload photo");
                          setIsUploadingLogo(false);
                          return;
                        }
                        const { data: urlData } = supabase.storage
                          .from('brand-assets')
                          .getPublicUrl(path);
                        setLogoUrl(urlData.publicUrl);
                        setIsUploadingLogo(false);
                        toast.success("Photo uploaded!");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={isUploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        const effectiveUserId = getEffectiveUserId();
                        if (!effectiveUserId) return;
                        const { data } = await supabase
                          .from('brand_assets')
                          .select('id, name, value')
                          .eq('user_id', effectiveUserId)
                          .eq('asset_type', 'image');
                        setLibraryImages(data || []);
                        setShowLibraryPicker(true);
                      }}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Choose from Library
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => setLogoUrl(null)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" placeholder="e.g., EcoThreads" value={companyData.businessName}
                  onChange={(e) => setCompanyData({ ...companyData, businessName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="e.g., www.yourbusiness.com" value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea id="shortDescription" placeholder="Describe your business and what you offer"
                  value={companyData.shortDescription} onChange={(e) => setCompanyData({ ...companyData, shortDescription: e.target.value })}
                  required className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={companyData.industry} onValueChange={(value) => setCompanyData({ ...companyData, industry: value })}>
                  <SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry.toLowerCase()}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productCategory">Product Category</Label>
                <Input id="productCategory" placeholder="e.g., Sustainable Fashion" value={companyData.productCategory}
                  onChange={(e) => setCompanyData({ ...companyData, productCategory: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geographyMarkets">Geography/Markets</Label>
                <Input id="geographyMarkets" placeholder="e.g., North America, Global" value={companyData.geographyMarkets}
                  onChange={(e) => setCompanyData({ ...companyData, geographyMarkets: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketingGoals">Marketing Goals</Label>
                <Textarea id="marketingGoals" placeholder="e.g., Brand Awareness, Lead Generation (comma separated)"
                  value={companyData.marketingGoals} onChange={(e) => setCompanyData({ ...companyData, marketingGoals: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainCompetitors">Main Competitors</Label>
                <Textarea id="mainCompetitors" placeholder="e.g., Competitor 1, Competitor 2 (comma separated)"
                  value={companyData.mainCompetitors} onChange={(e) => setCompanyData({ ...companyData, mainCompetitors: e.target.value })} />
              </div>
            </TabsContent>

            {/* Target Audience Tab */}
            <TabsContent value="audience" className="bg-card border border-border rounded-xl p-4 sm:p-8 space-y-6">
              <div className="space-y-2">
                <Label>Primary Audience Type *</Label>
                <Select value={audienceData.audienceType} onValueChange={(value) => setAudienceData({ ...audienceData, audienceType: value })}>
                  <SelectTrigger><SelectValue placeholder="Select audience type" /></SelectTrigger>
                  <SelectContent>
                    {audienceTypes.map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Main Audience Summary *</Label>
                <Textarea placeholder="Describe your ideal customer profile" value={audienceData.mainAudienceSummary}
                  onChange={(e) => setAudienceData({ ...audienceData, mainAudienceSummary: e.target.value })} required className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label>Secondary Audiences</Label>
                <Textarea placeholder="e.g., Eco-conscious parents, Minimalist professionals (comma separated)"
                  value={audienceData.secondaryAudiences} onChange={(e) => setAudienceData({ ...audienceData, secondaryAudiences: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Age Range</Label>
                  <div className="flex items-center gap-4">
                    <Slider value={audienceData.ageRange} onValueChange={(value) => setAudienceData({ ...audienceData, ageRange: value })}
                      max={80} min={18} step={1} className="flex-1" />
                    <span className="text-foreground font-medium w-8">{audienceData.ageRange[0]}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Income Level</Label>
                  <Input placeholder="e.g., $50,000 - $100,000" value={audienceData.incomeLevel}
                    onChange={(e) => setAudienceData({ ...audienceData, incomeLevel: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Female %</Label>
                  <Input type="number" min="0" max="100" value={audienceData.femalePercent}
                    onChange={(e) => setAudienceData({ ...audienceData, femalePercent: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Male %</Label>
                  <Input type="number" min="0" max="100" value={audienceData.malePercent}
                    onChange={(e) => setAudienceData({ ...audienceData, malePercent: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Geographic Focus</Label>
                <Input placeholder="e.g., North America, Global" value={audienceData.geographicFocus}
                  onChange={(e) => setAudienceData({ ...audienceData, geographicFocus: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Core Values & Interests</Label>
                <Textarea placeholder="e.g., Sustainability, Ethical manufacturing, Minimalism"
                  value={audienceData.coreValuesInterests} onChange={(e) => setAudienceData({ ...audienceData, coreValuesInterests: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lifestyle Summary</Label>
                <Textarea placeholder="Describe their lifestyle, habits, and preferences"
                  value={audienceData.lifestyleSummary} onChange={(e) => setAudienceData({ ...audienceData, lifestyleSummary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Frequency</Label>
                <Select value={audienceData.purchaseFrequency} onValueChange={(value) => setAudienceData({ ...audienceData, purchaseFrequency: value })}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    {purchaseFrequencies.map((freq) => (
                      <SelectItem key={freq} value={freq.toLowerCase()}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Purchase Channels</Label>
                <Textarea placeholder="e.g., Online Store, Instagram Shopping, Pop-up Events"
                  value={audienceData.preferredChannels} onChange={(e) => setAudienceData({ ...audienceData, preferredChannels: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Common Objections</Label>
                <Textarea placeholder="What hesitations might they have about your product?"
                  value={audienceData.commonObjections} onChange={(e) => setAudienceData({ ...audienceData, commonObjections: e.target.value })} />
              </div>
            </TabsContent>

            {/* Value Proposition Tab */}
            <TabsContent value="value" className="bg-card border border-border rounded-xl p-4 sm:p-8 space-y-6">
              <div className="space-y-2">
                <Label>Core Promise *</Label>
                <Textarea placeholder="Your fundamental brand commitment to customers" value={valueData.corePromise}
                  onChange={(e) => setValueData({ ...valueData, corePromise: e.target.value })} required className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label>Elevator Pitch *</Label>
                <Textarea placeholder="A concise explanation of what you do and why it matters" value={valueData.elevatorPitch}
                  onChange={(e) => setValueData({ ...valueData, elevatorPitch: e.target.value })} required className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label>Customer Pain Points</Label>
                <Textarea placeholder="e.g., Difficulty finding sustainable options, Limited style options"
                  value={valueData.customerPainPoints} onChange={(e) => setValueData({ ...valueData, customerPainPoints: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>How We Solve It</Label>
                <Textarea placeholder="e.g., Curated collections that blend sustainability with current trends"
                  value={valueData.howWeSolveIt} onChange={(e) => setValueData({ ...valueData, howWeSolveIt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Benefit Focus</Label>
                <Select value={valueData.benefitFocus} onValueChange={(value) => setValueData({ ...valueData, benefitFocus: value })}>
                  <SelectTrigger><SelectValue placeholder="Select primary benefit focus" /></SelectTrigger>
                  <SelectContent>
                    {benefitFocuses.map((focus) => (
                      <SelectItem key={focus} value={focus.toLowerCase()}>{focus}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unique Value Drivers</Label>
                <Textarea placeholder="e.g., 85% Recycled Materials, Carbon Neutral Shipping, Lifetime Warranty"
                  value={valueData.uniqueValueDrivers} onChange={(e) => setValueData({ ...valueData, uniqueValueDrivers: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Proof Points / Social Proof</Label>
                <Textarea placeholder="e.g., Featured in Vogue's 'Top 10 Sustainable Brands', 50,000+ happy customers"
                  value={valueData.proofPoints} onChange={(e) => setValueData({ ...valueData, proofPoints: e.target.value })} />
              </div>
            </TabsContent>

            {/* Import Tab - Links to dedicated Import page */}
            <TabsContent value="import" className="space-y-6">
              <Card className="p-8 text-center">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Import Brand Sources</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your website, social media accounts, and creative tools to automatically extract and organize your brand assets.
                </p>
                <Button 
                  type="button"
                  onClick={() => navigate("/profile/import")}
                  className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
                >
                  Go to Import Brand Sources
                </Button>
              </Card>
            </TabsContent>

            {/* Website Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsPlatformGrid />
              <WebsiteAnalyticsWidget />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 px-8">
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : "Save Profile"}
            </Button>
          </div>
        </form>
      </main>

      {/* Library Image Picker Dialog */}
      <Dialog open={showLibraryPicker} onOpenChange={setShowLibraryPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose from Library</DialogTitle>
          </DialogHeader>
          {libraryImages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No images found in your brand library.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {libraryImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="aspect-square rounded-lg border-2 border-border hover:border-primary overflow-hidden transition-colors"
                  onClick={() => {
                    setLogoUrl(img.value);
                    setShowLibraryPicker(false);
                    toast.success("Photo selected from library!");
                  }}
                >
                  <img src={img.value} alt={img.name || "Library image"} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyInfo;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Globe, Music, Facebook, Instagram, Linkedin, Twitter, Youtube, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { User } from "@supabase/supabase-js";

const socialPlatforms = [
  { name: "Facebook", icon: Facebook, color: "bg-blue-600", textColor: "text-blue-600" },
  { name: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", textColor: "text-pink-500" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700", textColor: "text-blue-700" },
  { name: "Twitter/X", icon: Twitter, color: "bg-gray-800", textColor: "text-gray-800 dark:text-gray-200" },
  { name: "YouTube", icon: Youtube, color: "bg-red-600", textColor: "text-red-600" },
  { name: "TikTok", icon: Music, color: "bg-black", textColor: "text-black dark:text-white" },
];

const ImportBrandSources = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);
    // TODO: Implement website scraping with Firecrawl
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Import Brand Sources</h1>
          <p className="text-muted-foreground">
            Connect your website and social media accounts to automatically extract and organize your brand assets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Website Import Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Website Import</h2>
                <p className="text-sm text-muted-foreground">Scan your website for brand assets</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Enter your website URL
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleScanWebsite}
                disabled={!websiteUrl || isScanning}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
              >
                {isScanning ? "Scanning..." : "⚡ Scan Website (1-5 min)"}
              </Button>

              <p className="text-xs text-muted-foreground">
                We will crawl your public pages and extract colors, fonts, copy blocks, images, and brand structure.
              </p>
            </div>
          </Card>

          {/* Social Media Import Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Music className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Social Media Import</h2>
                <p className="text-sm text-muted-foreground">Connect your social platforms</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {socialPlatforms.map((platform) => (
                <div key={platform.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center`}>
                      <platform.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full">
                    Connect Account
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Security Note */}
        <Card className="p-4 bg-muted/50 border-muted">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Security & Privacy:</h3>
              <p className="text-sm text-muted-foreground">
                We securely store your credentials and never share them with third parties. You can disconnect any account at any time. All imported assets are stored locally and can be managed from your library.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ImportBrandSources;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, FolderOpen, Image, FileText, Palette, Type, ExternalLink, Copy, Trash2, Loader2, Share2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useClientContext } from "@/contexts/ClientContext";

interface BrandAsset {
  id: string;
  asset_type: string;
  name: string | null;
  value: string;
  metadata: unknown;
  created_at: string;
  brand_import_id: string | null;
}

interface BrandImport {
  id: string;
  website_url: string;
  status: string;
  created_at: string;
}

const Library = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [imports, setImports] = useState<BrandImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState("assets");
  const { getEffectiveUserId, selectedClientId, selectedClientName, isDefaultClient } = useClientContext();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  // Refetch when client changes
  useEffect(() => {
    const effectiveUserId = getEffectiveUserId();
    if (effectiveUserId) {
      fetchAssets(effectiveUserId);
    }
  }, [selectedClientId, getEffectiveUserId]);

  const fetchAssets = async (userId: string) => {
    setLoading(true);
    try {
      const [assetsResponse, importsResponse] = await Promise.all([
        supabase.from('brand_assets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('brand_imports').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (assetsResponse.data) setAssets(assetsResponse.data);
      if (importsResponse.data) setImports(importsResponse.data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load brand assets');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard!');
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const { error } = await supabase.from('brand_assets').delete().eq('id', assetId);
      if (error) throw error;
      setAssets(prev => prev.filter(a => a.id !== assetId));
      toast.success('Asset deleted');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const filterAssets = (type: string) => assets.filter(a => a.asset_type === type);

  const ColorCard = ({ asset }: { asset: BrandAsset }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors group">
      <div className="w-12 h-12 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: asset.value }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{asset.name || 'Color'}</p>
        <p className="text-xs text-muted-foreground font-mono">{asset.value}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyValue(asset.value)}><Copy className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );

  const FontCard = ({ asset }: { asset: BrandAsset }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Type className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate" style={{ fontFamily: asset.value }}>{asset.name || asset.value}</p>
        <p className="text-xs text-muted-foreground">{asset.value}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyValue(asset.value)}><Copy className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );

  const ImageCard = ({ asset }: { asset: BrandAsset }) => (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors group">
      <div className="aspect-video bg-muted relative">
        <img src={asset.value} alt={asset.name || 'Brand image'} className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={asset.value} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" />Open</a>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <div className="p-2"><p className="text-xs font-medium text-foreground truncate">{asset.name || 'Image'}</p></div>
    </div>
  );

  const CopyCard = ({ asset }: { asset: BrandAsset }) => (
    <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground">{asset.name || 'Copy'}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyValue(asset.value)}><Copy className="w-3 h-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
      <p className="text-sm text-foreground line-clamp-3">{asset.value}</p>
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      <Button onClick={() => navigate("/profile/company")}>Import Brand Sources</Button>
    </div>
  );

  const AssetGrid = ({ type, icon: Icon, emptyTitle, emptyDesc }: { type: string; icon: React.ElementType; emptyTitle: string; emptyDesc: string }) => {
    const filtered = filterAssets(type);
    
    if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    if (filtered.length === 0) return <EmptyState icon={Icon} title={emptyTitle} description={emptyDesc} />;

    if (type === 'image') return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">{filtered.map(asset => <ImageCard key={asset.id} asset={asset} />)}</div>;
    if (type === 'copy') return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">{filtered.map(asset => <CopyCard key={asset.id} asset={asset} />)}</div>;
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">{filtered.map(asset => type === 'color' ? <ColorCard key={asset.id} asset={asset} /> : <FontCard key={asset.id} asset={asset} />)}</div>;
  };

  const SocialEmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12 flex-1">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="mb-4 sm:mb-6 text-primary hover:text-primary/80 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Brand Library</h1>
            <p className="text-sm sm:text-base text-muted-foreground">All your imported brand assets and social content</p>
          </div>
          <Button onClick={() => navigate("/profile/company")} className="w-full sm:w-auto">+ Import More</Button>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="assets" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Share2 className="w-4 h-4" />
              Social
            </TabsTrigger>
          </TabsList>

          {/* Assets Tab */}
          <TabsContent value="assets">
            {imports.length > 0 && (
              <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-sm font-medium text-foreground mb-2 sm:mb-3">Recent Imports</h3>
                <div className="flex flex-wrap gap-2">
                  {imports.slice(0, 5).map(imp => (
                    <div key={imp.id} className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted text-xs sm:text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${imp.status === 'completed' ? 'bg-green-500' : imp.status === 'scanning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{imp.website_url}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All ({assets.length})</TabsTrigger>
                <TabsTrigger value="images" className="text-xs sm:text-sm">Images ({filterAssets('image').length})</TabsTrigger>
                <TabsTrigger value="colors" className="text-xs sm:text-sm">Colors ({filterAssets('color').length})</TabsTrigger>
                <TabsTrigger value="fonts" className="text-xs sm:text-sm">Fonts ({filterAssets('font').length})</TabsTrigger>
                <TabsTrigger value="copy" className="text-xs sm:text-sm">Copy ({filterAssets('copy').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {loading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : assets.length === 0 ? (
                  <Card className="p-6">
                    <EmptyState icon={FolderOpen} title="No assets yet" description="Import your brand sources to start building your library. Your logos, images, colors, fonts, and copy will appear here." />
                  </Card>
                ) : (
                  <div className="space-y-6 sm:space-y-8">
                    {filterAssets('color').length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2"><Palette className="w-4 h-4 sm:w-5 sm:h-5" /> Colors</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">{filterAssets('color').map(asset => <ColorCard key={asset.id} asset={asset} />)}</div>
                      </div>
                    )}
                    {filterAssets('font').length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2"><Type className="w-4 h-4 sm:w-5 sm:h-5" /> Fonts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">{filterAssets('font').map(asset => <FontCard key={asset.id} asset={asset} />)}</div>
                      </div>
                    )}
                    {filterAssets('image').length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2"><Image className="w-4 h-4 sm:w-5 sm:h-5" /> Images</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">{filterAssets('image').map(asset => <ImageCard key={asset.id} asset={asset} />)}</div>
                      </div>
                    )}
                    {filterAssets('copy').length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2"><FileText className="w-4 h-4 sm:w-5 sm:h-5" /> Copy</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">{filterAssets('copy').map(asset => <CopyCard key={asset.id} asset={asset} />)}</div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="images"><Card className="p-6"><AssetGrid type="image" icon={Image} emptyTitle="No images yet" emptyDesc="Images from your website and social media will be stored here after import." /></Card></TabsContent>
              <TabsContent value="colors"><Card className="p-6"><AssetGrid type="color" icon={Palette} emptyTitle="No colors yet" emptyDesc="Your brand color palette will be extracted from your website and stored here." /></Card></TabsContent>
              <TabsContent value="fonts"><Card className="p-6"><AssetGrid type="font" icon={Type} emptyTitle="No fonts yet" emptyDesc="Font families and typography styles from your website will appear here." /></Card></TabsContent>
              <TabsContent value="copy"><Card className="p-6"><AssetGrid type="copy" icon={FileText} emptyTitle="No copy yet" emptyDesc="Text blocks and copy from your website and social posts will be stored here." /></Card></TabsContent>
            </Tabs>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                <Card className="p-6">
                  <SocialEmptyState icon={FileText} title="No posts yet" description="Connect your social media accounts in Business Profile to see your posts here." />
                </Card>
              </TabsContent>

              <TabsContent value="images">
                <Card className="p-6">
                  <SocialEmptyState icon={Image} title="No images yet" description="Images from your social media posts will appear here after connecting your accounts." />
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <Card className="p-6">
                  <SocialEmptyState icon={BarChart3} title="No analytics yet" description="Campaign metrics and performance data will be displayed here to show what worked and what didn't." />
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Library;

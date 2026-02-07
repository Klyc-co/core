import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Image, BarChart3, Download, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useClientContext } from "@/contexts/ClientContext";

// Platform icons
import { Facebook, Instagram, Youtube, Twitter, Linkedin } from "lucide-react";
import SnapchatIcon from "@/components/icons/SnapchatIcon";

interface SocialConnection {
  id: string;
  platform: string;
  platform_username: string | null;
}

interface SocialPost {
  id: string;
  platform: string;
  title?: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  media_type?: "image" | "video" | "text";
  created_at: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  permalink?: string;
}

interface PlatformAnalytics {
  followers?: number;
  following?: number;
  total_posts?: number;
  total_views?: number;
  engagement_rate?: number;
}

const PLATFORM_CONFIG: Record<string, { 
  name: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  fetchFunction: string;
}> = {
  youtube: { name: "YouTube", icon: Youtube, color: "text-red-500", fetchFunction: "youtube-fetch-posts" },
  instagram: { name: "Instagram", icon: Instagram, color: "text-pink-500", fetchFunction: "instagram-fetch-posts" },
  facebook: { name: "Facebook", icon: Facebook, color: "text-blue-600", fetchFunction: "facebook-fetch-posts" },
  twitter: { name: "X / Twitter", icon: Twitter, color: "text-foreground", fetchFunction: "twitter-fetch-posts" },
  linkedin: { name: "LinkedIn", icon: Linkedin, color: "text-blue-700", fetchFunction: "linkedin-fetch-posts" },
  tiktok: { name: "TikTok", icon: Play, color: "text-foreground", fetchFunction: "tiktok-fetch-posts" },
};

export default function SocialMediaContent() {
  const navigate = useNavigate();
  const { getEffectiveUserId } = useClientContext();
  
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (selectedPlatform) {
      fetchPlatformContent(selectedPlatform);
    }
  }, [selectedPlatform]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("social_connections")
        .select("id, platform, platform_username")
        .eq("user_id", userId);

      if (error) throw error;

      // Filter to only supported platforms
      const supportedPlatforms = Object.keys(PLATFORM_CONFIG);
      const filtered = (data || []).filter(c => supportedPlatforms.includes(c.platform));
      
      setConnections(filtered);
      
      // Auto-select first platform if available
      if (filtered.length > 0 && !selectedPlatform) {
        setSelectedPlatform(filtered[0].platform);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformContent = async (platform: string) => {
    setLoadingPosts(true);
    setPosts([]);
    setAnalytics(null);

    try {
      const config = PLATFORM_CONFIG[platform];
      if (!config) return;

      // Call the platform-specific fetch function
      const { data, error } = await supabase.functions.invoke(config.fetchFunction, {
        body: { limit: 50 },
      });

      if (error) {
        console.error(`Error fetching ${platform} posts:`, error);
        toast.error(`Failed to fetch ${config.name} posts`);
        return;
      }

      if (data?.posts) {
        setPosts(data.posts);
      }
      if (data?.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error(`Error fetching ${platform} content:`, error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const saveToLibrary = async (post: SocialPost) => {
    if (!post.media_url && !post.thumbnail_url) {
      toast.error("No media to save");
      return;
    }

    setSavingToLibrary(post.id);
    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("User not found");

      const mediaUrl = post.media_url || post.thumbnail_url;
      const assetType = post.media_type === "video" ? "video" : "image";

      await supabase.from("brand_assets").insert({
        user_id: userId,
        asset_type: assetType,
        name: post.title || post.caption?.slice(0, 50) || `${post.platform} post`,
        value: mediaUrl,
        metadata: {
          source: post.platform,
          post_id: post.id,
          permalink: post.permalink,
          original_caption: post.caption,
          created_at: post.created_at,
        },
      });

      toast.success("Saved to Assets!");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save to library");
    } finally {
      setSavingToLibrary(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Social Platforms Connected</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Connect your social media accounts to view your posts, images, and analytics.
          </p>
          <Button onClick={() => navigate("/profile/import")}>
            Connect Social Accounts
          </Button>
        </div>
      </Card>
    );
  }

  const filteredPosts = posts;
  const imagePosts = posts.filter(p => p.media_type === "image" || p.thumbnail_url);
  
  return (
    <div className="space-y-6">
      {/* Platform Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {connections.map((conn) => {
            const config = PLATFORM_CONFIG[conn.platform];
            if (!config) return null;
            const Icon = config.icon;
            const isActive = selectedPlatform === conn.platform;
            
            return (
              <button
                key={conn.id}
                onClick={() => setSelectedPlatform(conn.platform)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive 
                    ? "border-primary text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className={`w-4 h-4 ${config.color}`} />
                {config.name}
                {conn.platform_username && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    @{conn.platform_username}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {selectedPlatform && (
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="w-4 h-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card className="p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Posts Found</h3>
                  <p className="text-sm text-muted-foreground">
                    We couldn't fetch any posts from this platform. This may be due to API limitations.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="overflow-hidden group">
                    {/* Media Preview */}
                    {(post.thumbnail_url || post.media_url) && (
                      <div className="aspect-video bg-muted relative">
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt={post.title || "Post"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        {post.media_type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center">
                              <Play className="w-6 h-6 text-foreground" />
                            </div>
                          </div>
                        )}
                        {/* Overlay actions */}
                        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => saveToLibrary(post)}
                            disabled={savingToLibrary === post.id}
                          >
                            {savingToLibrary === post.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span className="ml-1">Save</span>
                          </Button>
                          {post.permalink && (
                            <Button size="sm" variant="secondary" asChild>
                              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Post Info */}
                    <div className="p-4">
                      {post.title && (
                        <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-1">
                          {post.title}
                        </h4>
                      )}
                      {post.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {post.caption}
                        </p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {post.views !== undefined && (
                          <span>{post.views.toLocaleString()} views</span>
                        )}
                        {post.likes !== undefined && (
                          <span>{post.likes.toLocaleString()} likes</span>
                        )}
                        {post.comments !== undefined && (
                          <span>{post.comments.toLocaleString()} comments</span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : imagePosts.length === 0 ? (
              <Card className="p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Images Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No image content available from this platform.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {imagePosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square rounded-lg overflow-hidden border border-border group relative"
                  >
                    <img
                      src={post.thumbnail_url || post.media_url}
                      alt={post.title || "Image"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => saveToLibrary(post)}
                        disabled={savingToLibrary === post.id}
                      >
                        {savingToLibrary === post.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      {post.permalink && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {analytics?.followers !== undefined && (
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.followers.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </Card>
                )}
                {analytics?.following !== undefined && (
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.following.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </Card>
                )}
                {analytics?.total_posts !== undefined && (
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.total_posts.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </Card>
                )}
                {analytics?.total_views !== undefined && (
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.total_views.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                  </Card>
                )}
                {analytics?.engagement_rate !== undefined && (
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.engagement_rate.toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  </Card>
                )}
                
                {/* If no analytics available */}
                {!analytics && (
                  <Card className="p-6 col-span-full">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Analytics Coming Soon</h3>
                      <p className="text-sm text-muted-foreground">
                        Detailed analytics for this platform will be available here.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

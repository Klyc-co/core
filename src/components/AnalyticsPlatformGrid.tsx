import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check, ExternalLink, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsPlatform {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  available: boolean;
}

const analyticsPlatforms: AnalyticsPlatform[] = [
  {
    id: "google_analytics",
    name: "Google Analytics",
    description: "The most popular web analytics service",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M22.84 2.997v17.998c0 1.106-.895 2.005-1.998 2.005-1.103 0-1.997-.899-1.997-2.005V2.997c0-1.106.894-1.997 1.997-1.997 1.103 0 1.998.891 1.998 1.997zM17.85 9v12c0 1.106-.895 2-1.998 2-1.103 0-1.997-.894-1.997-2V9c0-1.106.894-2 1.997-2 1.103 0 1.998.894 1.998 2zM12.857 15v6c0 1.106-.895 2-1.998 2-1.103 0-1.997-.894-1.997-2v-6c0-1.106.894-2 1.997-2 1.103 0 1.998.894 1.998 2zM5.157 21c0 1.106-.895 2-1.998 2-1.103 0-1.997-.894-1.997-2 0-1.106.894-2 1.997-2 1.103 0 1.998.894 1.998 2z"/>
      </svg>
    ),
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    available: true,
  },
  {
    id: "adobe_analytics",
    name: "Adobe Analytics",
    description: "Enterprise-level analytics solution",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425h-3.71zm-8.126-1.194L0 4.107h4.714l5.126 17.323H5.84zm18.16-17.323L24 21.438h-4.714l-5.126-17.331h5.84z"/>
      </svg>
    ),
    color: "text-red-600",
    bgColor: "bg-red-600/10",
    available: false,
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    description: "Product analytics for user behavior",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm0 3.6a6 6 0 100 12 6 6 0 000-12z"/>
      </svg>
    ),
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    available: false,
  },
  {
    id: "amplitude",
    name: "Amplitude",
    description: "Product analytics & event tracking",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    available: false,
  },
  {
    id: "matomo",
    name: "Matomo",
    description: "Open-source, privacy-focused analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 17.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-6 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-3-6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
      </svg>
    ),
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    available: false,
  },
  {
    id: "plausible",
    name: "Plausible",
    description: "Lightweight, privacy-first analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ),
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    available: false,
  },
  {
    id: "fathom",
    name: "Fathom",
    description: "Simple, GDPR-compliant analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    color: "text-violet-600",
    bgColor: "bg-violet-600/10",
    available: false,
  },
  {
    id: "hotjar",
    name: "Hotjar",
    description: "Heatmaps & session recordings",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 0C8.5 0 6 2.5 6 6c0 2.5 1.5 4.5 3.5 5.5C7.5 13 6 15 6 18c0 3.5 2.5 6 6 6s6-2.5 6-6c0-3-1.5-5-3.5-6.5C16.5 10.5 18 8.5 18 6c0-3.5-2.5-6-6-6zm0 21c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1.5 3-3 3zm0-12c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1.5 3-3 3z"/>
      </svg>
    ),
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    available: false,
  },
  {
    id: "heap",
    name: "Heap",
    description: "Auto-captures all interactions",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09l-6.9-3.46L12 4.18zM4 8.73l7 3.5v7.04l-7-3.5V8.73zm9 10.54v-7.04l7-3.5v7.04l-7 3.5z"/>
      </svg>
    ),
    color: "text-teal-600",
    bgColor: "bg-teal-600/10",
    available: false,
  },
  {
    id: "clicky",
    name: "Clicky",
    description: "Real-time web analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
    ),
    color: "text-cyan-600",
    bgColor: "bg-cyan-600/10",
    available: false,
  },
  {
    id: "woopra",
    name: "Woopra",
    description: "Customer journey analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
      </svg>
    ),
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    available: false,
  },
  {
    id: "kissmetrics",
    name: "Kissmetrics",
    description: "Revenue & conversion focused",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
    color: "text-pink-600",
    bgColor: "bg-pink-600/10",
    available: false,
  },
  {
    id: "cloudflare",
    name: "Cloudflare Analytics",
    description: "Privacy-focused, free analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03V7c0-.55-.45-1-1-1s-1 .45-1 1v.97c-1.48.74-2.5 2.26-2.5 4.03s1.02 3.29 2.5 4.03V17c0 .55.45 1 1 1s1-.45 1-1v-.97c1.48-.74 2.5-2.26 2.5-4.03zm-4.5 2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    ),
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
    available: false,
  },
];

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function AnalyticsPlatformGrid() {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check for Google Analytics connection
    const { data } = await supabase
      .from('social_connections')
      .select('platform')
      .eq('user_id', user.id)
      .eq('platform', 'google_analytics')
      .maybeSingle();

    if (data) {
      setConnectionStatus(prev => ({ ...prev, google_analytics: 'connected' }));
    }

    setIsLoading(false);
  };

  const handleConnect = async (platform: AnalyticsPlatform) => {
    if (!platform.available) {
      toast.info(`${platform.name} integration coming soon!`);
      return;
    }

    if (platform.id === 'google_analytics') {
      setConnectionStatus(prev => ({ ...prev, [platform.id]: 'connecting' }));
      
      try {
        const redirectUri = `${window.location.origin}/profile/company?tab=analytics`;
        
        const { data, error } = await supabase.functions.invoke('google-analytics-auth-url', {
          body: { redirectUri }
        });

        if (error) throw error;

        sessionStorage.setItem('ga_oauth_state', data.state);
        window.location.href = data.url;
      } catch (error) {
        console.error('Failed to start OAuth:', error);
        toast.error('Failed to connect Google Analytics');
        setConnectionStatus(prev => ({ ...prev, [platform.id]: 'disconnected' }));
      }
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('ga_oauth_state');

      if (code && state && storedState === state) {
        sessionStorage.removeItem('ga_oauth_state');
        window.history.replaceState({}, '', window.location.pathname + '?tab=analytics');
        
        try {
          const { data, error } = await supabase.functions.invoke('google-analytics-oauth-callback', {
            body: {
              code,
              redirectUri: `${window.location.origin}/profile/company?tab=analytics`
            }
          });

          if (error) throw error;

          toast.success(`Connected to Google Analytics as ${data.email}`);
          setConnectionStatus(prev => ({ ...prev, google_analytics: 'connected' }));
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('Failed to complete Google Analytics connection');
        }
      }
    };

    handleCallback();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const connectedCount = Object.values(connectionStatus).filter(s => s === 'connected').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Website Analytics Platforms
          </CardTitle>
          <CardDescription>
            Connect your analytics platform to import website performance data
            {connectedCount > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                ({connectedCount} connected)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsPlatforms.map((platform) => {
              const status = connectionStatus[platform.id] || 'disconnected';
              const isConnected = status === 'connected';
              const isConnecting = status === 'connecting';

              return (
                <div
                  key={platform.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isConnected 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${platform.bgColor} ${platform.color} flex items-center justify-center flex-shrink-0`}>
                      {platform.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {platform.name}
                        </h3>
                        {isConnected && (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isConnected ? "outline" : "default"}
                    size="sm"
                    className={`w-full mt-3 ${
                      isConnected 
                        ? 'border-green-500/50 text-green-600 dark:text-green-400' 
                        : !platform.available 
                          ? 'opacity-50' 
                          : ''
                    }`}
                    onClick={() => handleConnect(platform)}
                    disabled={isConnecting || (isConnected && platform.available)}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : isConnected ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    ) : platform.available ? (
                      <>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Connect
                      </>
                    ) : (
                      'Coming Soon'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

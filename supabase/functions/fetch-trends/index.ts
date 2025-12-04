import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const TWITTER_CONSUMER_KEY = Deno.env.get('TWITTER_CONSUMER_KEY');
const TWITTER_CONSUMER_SECRET = Deno.env.get('TWITTER_CONSUMER_SECRET');
const TWITTER_ACCESS_TOKEN = Deno.env.get('TWITTER_ACCESS_TOKEN');
const TWITTER_ACCESS_TOKEN_SECRET = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

interface TrendItem {
  platform: string;
  trend_name: string;
  trend_rank: number;
  trend_category?: string;
  trend_volume?: string;
  trend_url?: string;
}

// Use Firecrawl search to find trending topics
async function searchTrendingTopics(platform: string, query: string): Promise<TrendItem[]> {
  if (!FIRECRAWL_API_KEY) {
    console.log('FIRECRAWL_API_KEY not configured, using fallback for', platform);
    return [];
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 15,
        tbs: 'qdr:d', // Last 24 hours
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl search error for ${platform}:`, response.status);
      return [];
    }

    const data = await response.json();
    const trends: TrendItem[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((result: any, index: number) => {
        if (result.title) {
          trends.push({
            platform,
            trend_name: result.title.substring(0, 100),
            trend_rank: index + 1,
            trend_category: 'trending',
            trend_url: result.url,
          });
        }
      });
    }
    
    return trends;
  } catch (error) {
    console.error(`Error searching trends for ${platform}:`, error);
    return [];
  }
}

// Fetch Google Trends using RSS feed
async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    // Use Google Trends RSS feed for daily trends
    const response = await fetch('https://trends.google.com/trending/rss?geo=US');
    
    if (!response.ok) {
      console.error('Google Trends RSS error:', response.status);
      // Fallback to search
      return searchTrendingTopics('google', 'trending topics today United States');
    }

    const xml = await response.text();
    const trends: TrendItem[] = [];
    
    // Parse RSS XML to extract trending topics
    const itemRegex = /<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>[\s\S]*?<\/item>/g;
    let match;
    let rank = 1;
    
    while ((match = itemRegex.exec(xml)) !== null && rank <= 20) {
      const title = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      const traffic = match[2] || '';
      
      if (title && title.length > 2) {
        trends.push({
          platform: 'google',
          trend_name: title,
          trend_rank: rank++,
          trend_category: 'search',
          trend_volume: traffic,
        });
      }
    }
    
    // If RSS parsing didn't work well, try simple title extraction
    if (trends.length === 0) {
      const simpleTitleRegex = /<title>([^<]+)<\/title>/g;
      let simpleMatch;
      rank = 1;
      
      while ((simpleMatch = simpleTitleRegex.exec(xml)) !== null && rank <= 20) {
        const title = simpleMatch[1].replace(/&amp;/g, '&').trim();
        if (title && title.length > 2 && !title.includes('Daily Search Trends') && !title.includes('Google Trends')) {
          trends.push({
            platform: 'google',
            trend_name: title,
            trend_rank: rank++,
            trend_category: 'search',
          });
        }
      }
    }
    
    console.log(`Fetched ${trends.length} Google Trends`);
    return trends;
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    return searchTrendingTopics('google', 'trending topics today United States');
  }
}

// Fetch TikTok trending via search
async function fetchTikTokTrends(): Promise<TrendItem[]> {
  // Use search to find what's trending on TikTok
  const trends = await searchTrendingTopics('tiktok', 'TikTok trending hashtags sounds today site:tiktok.com OR site:newsweek.com OR site:today.com');
  
  // Also try to get general TikTok trending news
  const newsTrends = await searchTrendingTopics('tiktok', 'viral TikTok trends this week');
  
  const combined = [...trends];
  newsTrends.forEach((t, i) => {
    if (!combined.find(c => c.trend_name.toLowerCase() === t.trend_name.toLowerCase())) {
      combined.push({ ...t, trend_rank: combined.length + 1 });
    }
  });
  
  return combined.slice(0, 15);
}

// Fetch Instagram trending via search
async function fetchInstagramTrends(): Promise<TrendItem[]> {
  const trends = await searchTrendingTopics('instagram', 'Instagram trending hashtags reels today site:later.com OR site:hootsuite.com OR site:sproutsocial.com');
  return trends.slice(0, 15);
}

// Fetch LinkedIn trending via search
async function fetchLinkedInTrends(): Promise<TrendItem[]> {
  const trends = await searchTrendingTopics('linkedin', 'LinkedIn trending topics news today site:linkedin.com/pulse OR site:socialmediatoday.com');
  return trends.slice(0, 15);
}

// Fetch Facebook trending via search
async function fetchFacebookTrends(): Promise<TrendItem[]> {
  const trends = await searchTrendingTopics('facebook', 'Facebook trending topics viral posts today');
  return trends.slice(0, 15);
}

// Fetch Snapchat trending via search
async function fetchSnapchatTrends(): Promise<TrendItem[]> {
  const trends = await searchTrendingTopics('snapchat', 'Snapchat trending lenses filters spotlight today');
  return trends.slice(0, 10);
}

// Fetch Twitter/X trends (requires API keys or fallback to search)
async function fetchTwitterTrends(): Promise<TrendItem[]> {
  if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    console.log('Twitter API keys not configured, using search fallback');
    const trends = await searchTrendingTopics('twitter', 'Twitter X trending topics hashtags today');
    return trends.slice(0, 15);
  }

  try {
    // OAuth 1.0a implementation for Twitter API
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
    const oauthNonce = crypto.randomUUID().replace(/-/g, '');
    
    // For now, use search fallback until full OAuth implementation
    console.log('Twitter API keys detected - using search until OAuth fully implemented');
    const trends = await searchTrendingTopics('twitter', 'Twitter X trending topics hashtags today');
    return trends.slice(0, 15);
  } catch (error) {
    console.error('Error fetching Twitter trends:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platforms } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allTrends: TrendItem[] = [];
    const requestedPlatforms = platforms || ['tiktok', 'instagram', 'linkedin', 'facebook', 'google', 'twitter', 'snapchat'];

    console.log(`Fetching trends for platforms: ${requestedPlatforms.join(', ')}`);

    // Fetch trends from each platform in parallel
    const promises: { platform: string; promise: Promise<TrendItem[]> }[] = [];

    if (requestedPlatforms.includes('google')) {
      promises.push({ platform: 'google', promise: fetchGoogleTrends() });
    }

    if (requestedPlatforms.includes('tiktok')) {
      promises.push({ platform: 'tiktok', promise: fetchTikTokTrends() });
    }

    if (requestedPlatforms.includes('instagram')) {
      promises.push({ platform: 'instagram', promise: fetchInstagramTrends() });
    }

    if (requestedPlatforms.includes('linkedin')) {
      promises.push({ platform: 'linkedin', promise: fetchLinkedInTrends() });
    }

    if (requestedPlatforms.includes('facebook')) {
      promises.push({ platform: 'facebook', promise: fetchFacebookTrends() });
    }

    if (requestedPlatforms.includes('twitter')) {
      promises.push({ platform: 'twitter', promise: fetchTwitterTrends() });
    }

    if (requestedPlatforms.includes('snapchat')) {
      promises.push({ platform: 'snapchat', promise: fetchSnapchatTrends() });
    }

    const results = await Promise.allSettled(promises.map(p => p.promise));
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`${promises[index].platform}: ${result.value.length} trends found`);
        allTrends.push(...result.value);
      } else {
        console.error(`${promises[index].platform}: failed -`, result.reason);
      }
    });

    console.log(`Found ${allTrends.length} total trends`);

    // Save trends to database
    if (allTrends.length > 0) {
      const trendsToInsert = allTrends.map(trend => ({
        user_id: userId,
        platform: trend.platform,
        trend_name: trend.trend_name,
        trend_rank: trend.trend_rank,
        trend_category: trend.trend_category,
        trend_volume: trend.trend_volume,
        trend_url: trend.trend_url,
        scraped_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('social_trends')
        .insert(trendsToInsert);

      if (insertError) {
        console.error('Error inserting trends:', insertError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      trends: allTrends,
      count: allTrends.length,
      platforms: requestedPlatforms,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in fetch-trends:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

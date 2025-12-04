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

// Scrape trends using Firecrawl
async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error for ${url}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.markdown || null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Parse TikTok trending content
function parseTikTokTrends(markdown: string): TrendItem[] {
  const trends: TrendItem[] = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let rank = 1;
  for (const line of lines) {
    // Look for hashtag patterns or trending sounds
    const hashtagMatch = line.match(/#(\w+)/g);
    if (hashtagMatch) {
      for (const tag of hashtagMatch.slice(0, 10)) {
        trends.push({
          platform: 'tiktok',
          trend_name: tag,
          trend_rank: rank++,
          trend_category: 'hashtag',
        });
      }
    }
  }
  
  return trends.slice(0, 20);
}

// Parse Instagram trending
function parseInstagramTrends(markdown: string): TrendItem[] {
  const trends: TrendItem[] = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let rank = 1;
  for (const line of lines) {
    const hashtagMatch = line.match(/#(\w+)/g);
    if (hashtagMatch) {
      for (const tag of hashtagMatch.slice(0, 10)) {
        trends.push({
          platform: 'instagram',
          trend_name: tag,
          trend_rank: rank++,
          trend_category: 'hashtag',
        });
      }
    }
  }
  
  return trends.slice(0, 20);
}

// Parse LinkedIn trending
function parseLinkedInTrends(markdown: string): TrendItem[] {
  const trends: TrendItem[] = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let rank = 1;
  // Look for news headlines or trending topics
  for (const line of lines) {
    if (line.length > 20 && line.length < 200 && !line.startsWith('http')) {
      const cleanLine = line.replace(/[#\[\]]/g, '').trim();
      if (cleanLine && !cleanLine.includes('Sign in') && !cleanLine.includes('Join now')) {
        trends.push({
          platform: 'linkedin',
          trend_name: cleanLine.substring(0, 100),
          trend_rank: rank++,
          trend_category: 'news',
        });
      }
    }
  }
  
  return trends.slice(0, 15);
}

// Parse Facebook trending (limited)
function parseFacebookTrends(markdown: string): TrendItem[] {
  const trends: TrendItem[] = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let rank = 1;
  for (const line of lines) {
    if (line.length > 15 && line.length < 150) {
      const cleanLine = line.replace(/[#\[\]]/g, '').trim();
      if (cleanLine && !cleanLine.includes('Log in') && !cleanLine.includes('Sign up')) {
        trends.push({
          platform: 'facebook',
          trend_name: cleanLine.substring(0, 100),
          trend_rank: rank++,
          trend_category: 'topic',
        });
      }
    }
  }
  
  return trends.slice(0, 10);
}

// Fetch Google Trends
async function fetchGoogleTrends(): Promise<TrendItem[]> {
  const markdown = await scrapeWithFirecrawl('https://trends.google.com/trending?geo=US');
  if (!markdown) return [];
  
  const trends: TrendItem[] = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let rank = 1;
  for (const line of lines) {
    // Look for trend names (usually formatted with search volume)
    if (line.length > 3 && line.length < 100 && !line.includes('http') && !line.startsWith('#')) {
      const cleanLine = line.replace(/[*_\[\]]/g, '').trim();
      if (cleanLine && /^[A-Za-z0-9\s]+$/.test(cleanLine)) {
        trends.push({
          platform: 'google',
          trend_name: cleanLine,
          trend_rank: rank++,
          trend_category: 'search',
        });
      }
    }
  }
  
  return trends.slice(0, 20);
}

// Fetch Twitter trends (requires API keys)
async function fetchTwitterTrends(): Promise<TrendItem[]> {
  if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    console.log('Twitter API keys not configured, skipping Twitter trends');
    return [];
  }

  try {
    // For now, return empty - will implement OAuth 1.0a signing when keys are provided
    // This is placeholder for when user provides Twitter API keys
    console.log('Twitter API integration ready - keys detected');
    return [];
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
    const requestedPlatforms = platforms || ['tiktok', 'instagram', 'linkedin', 'facebook', 'google', 'twitter'];

    console.log(`Fetching trends for platforms: ${requestedPlatforms.join(', ')}`);

    // Fetch trends from each platform in parallel
    const promises: Promise<TrendItem[]>[] = [];

    if (requestedPlatforms.includes('tiktok')) {
      promises.push(
        scrapeWithFirecrawl('https://www.tiktok.com/discover').then(md => 
          md ? parseTikTokTrends(md) : []
        )
      );
    }

    if (requestedPlatforms.includes('instagram')) {
      promises.push(
        scrapeWithFirecrawl('https://www.instagram.com/explore/tags/trending/').then(md =>
          md ? parseInstagramTrends(md) : []
        )
      );
    }

    if (requestedPlatforms.includes('linkedin')) {
      promises.push(
        scrapeWithFirecrawl('https://www.linkedin.com/news/').then(md =>
          md ? parseLinkedInTrends(md) : []
        )
      );
    }

    if (requestedPlatforms.includes('facebook')) {
      promises.push(
        scrapeWithFirecrawl('https://www.facebook.com/').then(md =>
          md ? parseFacebookTrends(md) : []
        )
      );
    }

    if (requestedPlatforms.includes('google')) {
      promises.push(fetchGoogleTrends());
    }

    if (requestedPlatforms.includes('twitter')) {
      promises.push(fetchTwitterTrends());
    }

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTrends.push(...result.value);
      }
    }

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalyticsMetrics {
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  returningUsers: number;
}

interface TrafficSource {
  source: string;
  sessions: number;
  percentage: number;
}

interface TopPage {
  path: string;
  title: string;
  pageviews: number;
  avgTimeOnPage: number;
}

interface DailyData {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get('GOOGLE_ANALYTICS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_ANALYTICS_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Failed to refresh token:', await response.text());
    return null;
  }

  return response.json();
}

async function listGAProperties(accessToken: string): Promise<Array<{ propertyId: string; displayName: string }>> {
  // List all GA4 properties the user has access to
  const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('Failed to list properties:', await response.text());
    return [];
  }

  const data = await response.json();
  const properties: Array<{ propertyId: string; displayName: string }> = [];

  for (const account of data.accountSummaries || []) {
    for (const property of account.propertySummaries || []) {
      // Extract property ID from the resource name (e.g., "properties/123456")
      const propertyId = property.property.replace('properties/', '');
      properties.push({
        propertyId,
        displayName: property.displayName,
      });
    }
  }

  return properties;
}

async function fetchAnalyticsData(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<{
  metrics: AnalyticsMetrics;
  trafficSources: TrafficSource[];
  topPages: TopPage[];
  dailyData: DailyData[];
}> {
  const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  // Fetch overview metrics
  const metricsResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'newUsers' },
      ],
    }),
  });

  let metrics: AnalyticsMetrics = {
    pageviews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    newUsers: 0,
    returningUsers: 0,
  };

  if (metricsResponse.ok) {
    const metricsData = await metricsResponse.json();
    const values = metricsData.rows?.[0]?.metricValues || [];
    metrics = {
      pageviews: parseInt(values[0]?.value || '0'),
      uniqueVisitors: parseInt(values[1]?.value || '0'),
      sessions: parseInt(values[2]?.value || '0'),
      bounceRate: parseFloat(values[3]?.value || '0') * 100,
      avgSessionDuration: parseFloat(values[4]?.value || '0'),
      newUsers: parseInt(values[5]?.value || '0'),
      returningUsers: Math.max(0, parseInt(values[1]?.value || '0') - parseInt(values[5]?.value || '0')),
    };
  } else {
    console.error('Metrics fetch failed:', await metricsResponse.text());
  }

  // Fetch traffic sources
  const sourcesResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
  });

  let trafficSources: TrafficSource[] = [];
  if (sourcesResponse.ok) {
    const sourcesData = await sourcesResponse.json();
    const totalSessions = metrics.sessions || 1;
    trafficSources = (sourcesData.rows || []).map((row: any) => ({
      source: row.dimensionValues[0]?.value || 'Unknown',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      percentage: (parseInt(row.metricValues[0]?.value || '0') / totalSessions) * 100,
    }));
  }

  // Fetch top pages
  const pagesResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
  });

  let topPages: TopPage[] = [];
  if (pagesResponse.ok) {
    const pagesData = await pagesResponse.json();
    topPages = (pagesData.rows || []).map((row: any) => ({
      path: row.dimensionValues[0]?.value || '/',
      title: row.dimensionValues[1]?.value || 'Untitled',
      pageviews: parseInt(row.metricValues[0]?.value || '0'),
      avgTimeOnPage: parseFloat(row.metricValues[1]?.value || '0'),
    }));
  }

  // Fetch daily data for charts
  const dailyResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  });

  let dailyData: DailyData[] = [];
  if (dailyResponse.ok) {
    const dailyDataResponse = await dailyResponse.json();
    dailyData = (dailyDataResponse.rows || []).map((row: any) => ({
      date: row.dimensionValues[0]?.value || '',
      pageviews: parseInt(row.metricValues[0]?.value || '0'),
      sessions: parseInt(row.metricValues[1]?.value || '0'),
      users: parseInt(row.metricValues[2]?.value || '0'),
    }));
  }

  return { metrics, trafficSources, topPages, dailyData };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    
    const { action, propertyId, startDate, endDate, targetUserId } = await req.json();

    // Create admin client for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine which user's connection to use
    // If targetUserId is provided, verify the caller has access (is the marketer for that client)
    let connectionUserId = userId;
    
    if (targetUserId && targetUserId !== userId) {
      // Verify the caller is a marketer for this client
      const { data: clientLink, error: linkError } = await supabaseAdmin
        .from('marketer_clients')
        .select('id')
        .eq('marketer_id', userId)
        .eq('client_id', targetUserId)
        .maybeSingle();
      
      if (linkError || !clientLink) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      connectionUserId = targetUserId;
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', connectionUserId)
      .eq('platform', 'google_analytics')
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Google Analytics not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt access token
    let accessToken = await decryptToken(connection.access_token);
    
    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      console.log('Token expired, refreshing...');
      if (!connection.refresh_token) {
        return new Response(JSON.stringify({ error: 'Token expired and no refresh token available' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const decryptedRefresh = await decryptToken(connection.refresh_token);
      const newTokens = await refreshAccessToken(decryptedRefresh);
      
      if (!newTokens) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      accessToken = newTokens.access_token;

      // Update the stored token
      const { encryptToken } = await import("../_shared/encryption.ts");
      await supabaseAdmin
        .from('social_connections')
        .update({
          access_token: await encryptToken(newTokens.access_token),
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
    }

    // Handle different actions
    if (action === 'listProperties') {
      const properties = await listGAProperties(accessToken);
      return new Response(JSON.stringify({ properties }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getData') {
      if (!propertyId) {
        return new Response(JSON.stringify({ error: 'Property ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await fetchAnalyticsData(
        accessToken,
        propertyId,
        startDate || '30daysAgo',
        endDate || 'today'
      );

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

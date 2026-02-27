import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// ===== GZIP + AES-256-GCM ENCRYPTION HELPERS =====

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function encryptPayload(plaintext: string): Promise<{ encrypted_payload: string; iv: string; v: number; compression: string; original_size: number; compressed_size: number; encrypted_size: number } | null> {
  const keyHex = Deno.env.get("ZAPIER_PAYLOAD_KEY")?.trim();
  if (!keyHex || keyHex.length !== 64) {
    console.warn(`ZAPIER_PAYLOAD_KEY issue — length: ${keyHex?.length ?? 'undefined'}, expected 64 hex chars. Sending plaintext.`);
    return null;
  }

  const keyBytes = hexToBytes(keyHex);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );

  const originalBytes = new TextEncoder().encode(plaintext);
  const originalSize = originalBytes.length;

  // GZIP compress
  const compressed = await gzipCompress(originalBytes);
  const compressedSize = compressed.length;

  // AES-256-GCM encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key, compressed.buffer as ArrayBuffer
  );
  const ciphertextBytes = new Uint8Array(ciphertext);

  // Base64 encode
  const encrypted_payload = base64Encode(ciphertextBytes);

  return {
    encrypted_payload,
    iv: bytesToHex(iv),
    v: 1,
    compression: "gzip",
    original_size: originalSize,
    compressed_size: compressedSize,
    encrypted_size: ciphertextBytes.length,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function truncate(str: string | null | undefined, max = 1000): string | undefined {
  if (!str) return undefined;
  return str.length > max ? str.slice(0, max) : str;
}

function stripNulls(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return obj;
}

function gzipAndEncode(data: any): { encoded: string; sizeBytes: number; wasTruncated: boolean } {
  let json = JSON.stringify(data || {});
  let wasTruncated = false;
  // Simple size check - if JSON is > 4KB, summarize
  if (json.length > 4096) {
    const summary = typeof data === "object" ? { fieldCount: Object.keys(data).length, note: "Summarized due to size" } : { note: "Truncated" };
    json = JSON.stringify(summary);
    wasTruncated = true;
  }
  const encoded = base64Encode(new TextEncoder().encode(json));
  return { encoded, sizeBytes: encoded.length, wasTruncated };
}

async function computePayloadHash(payloadString: string): Promise<string> {
  const data = new TextEncoder().encode(payloadString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendWithRetry(
  url: string,
  payloadString: string,
  payloadHash: string,
  payloadSizeBytes: number,
  maxRetries = 3
): Promise<{ status: number; body: string; attempts: number; attemptLogs: any[] }> {
  let lastError: Error | null = null;
  const attemptLogs: any[] = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptLog: any = {
      attemptNumber: attempt,
      timestamp: new Date().toISOString(),
      payloadHash,
      payloadSizeBytes,
      webhookUrl: url,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadString,
      });
      const body = await response.text();
      attemptLog.responseCode = response.status;
      attemptLog.responseBody = body;
      attemptLogs.push(attemptLog);
      console.log(`Attempt ${attempt} log:`, JSON.stringify(attemptLog));
      return { status: response.status, body, attempts: attempt, attemptLogs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attemptLog.responseCode = 0;
      attemptLog.responseBody = lastError.message;
      attemptLogs.push(attemptLog);
      console.log(`Attempt ${attempt} failed:`, JSON.stringify(attemptLog));
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError || new Error("All retry attempts failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignDraftId, testMode, useSyntheticData } = await req.json();

    // Platform-level Zapier webhook — same endpoint for all users (Klyc-owned)
    const resolvedWebhookUrl = Deno.env.get("ZAPIER_PLATFORM_WEBHOOK_URL");

    if (!resolvedWebhookUrl) {
      console.error("ZAPIER_PLATFORM_WEBHOOK_URL secret is not configured");
      return new Response(JSON.stringify({ error: "Platform webhook not configured. Contact support." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let campaignContext: any;

    if (useSyntheticData) {
      // ===== SYNTHETIC DATA GENERATION =====
      const syntheticBrand = {
        businessName: "Apex Digital Co.",
        website: "https://apexdigital.co",
        description: "A next-gen SaaS platform for AI-powered marketing automation, serving mid-market e-commerce brands globally.",
        industry: "Marketing Technology",
        productCategory: "SaaS / Marketing Automation",
        geographyMarkets: "North America, Europe, APAC",
        marketingGoals: "Drive product-led growth through viral social content and strategic partnerships with top-tier influencers.",
        valueProposition: "10x your content output with AI that understands your brand voice, audience, and competitive landscape.",
        logoUrl: "https://apexdigital.co/logo.png",
        brandColors: ["#1A1A2E", "#16213E", "#0F3460", "#E94560"],
        mainCompetitors: "HubSpot, Hootsuite, Sprout Social, Buffer, Later, Loomly, Sendible, Brandwatch",
        assetsSummary: { totalAssets: 47, byType: { logo: 3, color: 8, font: 4, image: 22, video: 10 } },
        productLines: [
          { id: "pl-1", name: "Apex Studio", description: "AI-powered content creation suite for social media marketers." },
          { id: "pl-2", name: "Apex Analytics", description: "Real-time performance dashboards with predictive engagement scoring." },
          { id: "pl-3", name: "Apex Distribute", description: "Multi-platform publishing and scheduling engine." },
        ],
      };

      const syntheticAudienceRaw = {
        demographics: { ageRange: "25-44", gender: "60% female, 40% male", income: "$50K-$150K" },
        psychographics: { interests: ["digital marketing", "AI tools", "growth hacking", "e-commerce"], values: ["efficiency", "innovation", "ROI-driven"] },
        behaviors: { platforms: ["Instagram", "LinkedIn", "TikTok"], contentPreferences: ["short-form video", "carousel posts", "case studies"], peakActivity: "9am-12pm EST" },
      };
      const audienceCompressed = gzipAndEncode(syntheticAudienceRaw);

      const syntheticAudience = {
        primaryDescription: "Marketing managers and social media strategists at mid-market e-commerce brands (25-44, tech-savvy, ROI-focused).",
        audienceDataCompressed: audienceCompressed.encoded,
        compressedSizeBytes: audienceCompressed.sizeBytes,
        wasTruncated: audienceCompressed.wasTruncated,
      };

      const competitorNames = [
        { name: "HubSpot", share: 28, videoDom: true },
        { name: "Hootsuite", share: 22, videoDom: false },
        { name: "Sprout Social", share: 18, videoDom: true },
        { name: "Buffer", share: 14, videoDom: true },
        { name: "Later", share: 10, videoDom: false },
        { name: "Loomly", share: 4, videoDom: false },
        { name: "Sendible", share: 3, videoDom: false },
        { name: "Brandwatch", share: 1, videoDom: false },
      ];

      const syntheticCompetitorItems = competitorNames.slice(0, 5).map((c, i) => ({
        name: c.name,
        url: `https://${c.name.toLowerCase().replace(/\s/g, "")}.com`,
        description: `${c.name} is a leading marketing platform with strong presence in social media management.`,
        targetAudience: "SMBs and enterprise marketing teams",
        valueProposition: `Comprehensive ${c.name} suite for social media management and analytics.`,
        keyProducts: "Social scheduling, Analytics, CRM integration",
        pricingStrategy: i < 2 ? "Freemium + Enterprise tiers" : "Subscription-based",
        marketingChannels: "Content marketing, Paid social, Webinars, SEO",
        swot: {
          strengths: `Strong brand recognition, large user base, extensive integrations.`,
          weaknesses: `Higher pricing for advanced features, slower innovation cycle.`,
          opportunities: `AI-driven content creation, short-form video automation.`,
          threats: `New AI-native competitors, platform API restrictions.`,
        },
        analyzedAt: new Date(Date.now() - i * 86400000).toISOString(),
        marketSharePercent: c.share,
        primaryContentMix: c.videoDom
          ? { textPercent: 15, imagePercent: 20, shortFormVideoPercent: 40, longFormVideoPercent: 25 }
          : { textPercent: 35, imagePercent: 35, shortFormVideoPercent: 20, longFormVideoPercent: 10 },
        videoDominant: c.videoDom,
      }));

      const syntheticCompetitors = {
        totalCompetitorCount: 8,
        includedTop: 5,
        selectionBasis: "market_share",
        items: syntheticCompetitorItems,
      };

      const syntheticCampaign = {
        id: "draft-synth-001",
        idea: "Launch a 'Creator Spotlight' video series featuring real customers using Apex Studio to build content in under 60 seconds — distributed across LinkedIn, Instagram Reels, and TikTok.",
        objective: "brand_awareness",
        goals: "Achieve 500K impressions and 10K engagements across all platforms within 14 days of launch.",
        contentType: "social_video",
        postCaption: "Watch how @RealCustomer creates scroll-stopping content in 60 seconds flat 🚀 #ApexStudio #AIMarketing #ContentCreator",
        imagePrompt: "A split-screen showing a marketer on one side and AI-generated content on the other, vibrant neon color scheme.",
        videoScript: "HOOK: What if you could create a week's worth of content in 60 seconds? BODY: Meet Sarah, a marketing manager who tripled her engagement using Apex Studio. CTA: Try it free today.",
        scenePrompts: "Scene 1: Close-up of hands typing on laptop. Scene 2: AI dashboard generating content. Scene 3: Phone showing viral post metrics. Scene 4: Team celebrating results.",
        articleOutline: null,
        targetAudience: "social_media_managers",
        targetAudienceDescription: "Marketing managers and content strategists at DTC e-commerce brands with 10-200 employees.",
        tags: ["video", "brand-awareness", "AI", "creator-spotlight", "short-form"],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Platform targets: linkedin, instagram, tiktok — min 2 per platform, >50% video
      const syntheticPerPlatformPostCount = [
        { platform: "linkedin", plannedPosts: 3, contentTypeMix: { video: 2, image: 1, text: 0 } },
        { platform: "instagram", plannedPosts: 4, contentTypeMix: { video: 3, image: 1, text: 0 } },
        { platform: "tiktok", plannedPosts: 3, contentTypeMix: { video: 3, image: 0, text: 0 } },
      ];
      const syntheticTotalPlannedPosts = syntheticPerPlatformPostCount.reduce((s, p) => s + p.plannedPosts, 0); // 10
      const syntheticTotalVideoPosts = syntheticPerPlatformPostCount.reduce((s, p) => s + p.contentTypeMix.video, 0); // 8

      const syntheticDistribution = {
        connectedPlatforms: [
          { platform: "linkedin", username: "apexdigitalco", platformUserId: "li-9281", scopes: ["w_member_social", "r_liteprofile"], tokenExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), connectedAt: new Date(Date.now() - 86400000 * 60).toISOString() },
          { platform: "instagram", username: "apex.digital", platformUserId: "ig-44821", scopes: ["publish_media", "pages_read_engagement"], tokenExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), connectedAt: new Date(Date.now() - 86400000 * 45).toISOString() },
          { platform: "tiktok", username: "apexdigital", platformUserId: "tt-77123", scopes: ["video.upload", "video.list"], tokenExpiresAt: new Date(Date.now() + 86400000 * 15).toISOString(), connectedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
        ],
        publishingPlan: {
          perPlatformPostCount: syntheticPerPlatformPostCount,
          totalPlannedPosts: syntheticTotalPlannedPosts,
        },
      };

      const syntheticPerformanceSummary = {
        timeWindow: "last_30_days",
        totalPostsTracked: 42,
        aggregateMetrics: {
          totalViews: 284000, totalLikes: 18400, totalComments: 2100, totalShares: 3200,
          totalSaves: 1450, totalClicks: 5600, totalImpressions: 412000, totalReach: 198000,
          avgEngagementRate: 4.72,
        },
        byPlatform: [
          { platform: "linkedin", postCount: 14, totalViews: 92000, totalLikes: 5200, avgEngagementRate: 5.1 },
          { platform: "instagram", postCount: 18, totalViews: 124000, totalLikes: 9800, avgEngagementRate: 4.8 },
          { platform: "tiktok", postCount: 10, totalViews: 68000, totalLikes: 3400, avgEngagementRate: 3.9 },
        ],
        brandSentiment: {
          searchTerm: "Apex Digital", sentiment: "Positive", mentions: 312, sources: 28,
          positivePercent: 72, neutralPercent: 21, negativePercent: 7,
          summary: "Strong positive sentiment driven by product launch reception and customer testimonials.",
          generatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        scheduledReports: [{ searchTerm: "Apex Digital", frequency: "daily", isActive: true }],
      };

      const syntheticRecentTrends = [
        { platform: "tiktok", trendName: "#AIMarketing", category: "Technology", volume: "2.1M", rank: 3, url: "https://tiktok.com/tag/aimarketing", scrapedAt: new Date(Date.now() - 3600000).toISOString() },
        { platform: "instagram", trendName: "Reels Remix Challenge", category: "Content Format", volume: "890K", rank: 7, url: "https://instagram.com/explore/tags/reelsremix", scrapedAt: new Date(Date.now() - 7200000).toISOString() },
        { platform: "linkedin", trendName: "AI in B2B Marketing", category: "Industry", volume: "450K", rank: 1, url: "https://linkedin.com/pulse/ai-b2b-marketing", scrapedAt: new Date(Date.now() - 10800000).toISOString() },
        { platform: "tiktok", trendName: "#60SecondBrand", category: "Branding", volume: "1.3M", rank: 5, url: "https://tiktok.com/tag/60secondbrand", scrapedAt: new Date(Date.now() - 14400000).toISOString() },
      ];

      const syntheticHistoricalInsights = {
        totalCampaignDrafts: 23,
        contentTypeMix: { social_video: 12, visual_post: 7, written: 3, video_ad: 1 },
        topTags: [
          { tag: "video", count: 14 }, { tag: "brand-awareness", count: 11 }, { tag: "AI", count: 9 },
          { tag: "short-form", count: 8 }, { tag: "product-launch", count: 6 },
        ],
        publishingHistory: {
          totalPublished: 38, totalFailed: 2, totalScheduled: 4,
          platformBreakdown: [
            { platform: "linkedin", published: 14, failed: 0 },
            { platform: "instagram", published: 16, failed: 1 },
            { platform: "tiktok", published: 8, failed: 1 },
          ],
        },
      };

      // Video strategy: 8/10 = 80% video => videoHeavyStrategy = true
      // Also 3/5 top competitors are videoDominant => majority check also triggers
      const syntheticVideoHeavy = syntheticTotalVideoPosts > syntheticTotalPlannedPosts / 2; // 8 > 5 => true

      const syntheticMonetizationFlags = {
        videoHeavyStrategy: syntheticVideoHeavy,
        estimatedVideoPosts: syntheticTotalVideoPosts,
        feeMultiplier: syntheticVideoHeavy ? 1.5 : 1.0,
      };

      campaignContext = stripNulls({
        schemaVersion: "1.0.0",
        syntheticData: true,
        identity: { userId, email: user.email, activeClientContext: { mode: "my_business", clientRosterCount: 0 } },
        brand: syntheticBrand,
        audience: syntheticAudience,
        competitors: syntheticCompetitors,
        campaign: syntheticCampaign,
        assets: { logos: [{ name: "Primary Logo", url: "https://apexdigital.co/logo.png" }], colors: [{ name: "Dark Navy", value: "#1A1A2E" }, { name: "Accent Red", value: "#E94560" }], fonts: [{ name: "Inter", value: "Inter" }], images: [{ name: "Hero Banner", url: "https://apexdigital.co/hero.jpg" }], totalAssets: 47 },
        distribution: syntheticDistribution,
        crmSummary: {
          connections: [{ provider: "hubspot", displayName: "HubSpot CRM", status: "connected", syncFrequencyMinutes: 60, lastSyncAt: new Date(Date.now() - 3600000).toISOString() }],
          aggregateMetrics: { totalContacts: 1248, totalCompanies: 89, totalDeals: 34, totalOrders: 156, totalDealValue: 287500, totalOrderRevenue: 412800, dealsByStage: [{ stage: "negotiation", count: 12, totalValue: 145000 }, { stage: "closed_won", count: 18, totalValue: 98500 }, { stage: "proposal", count: 4, totalValue: 44000 }], ordersByStatus: [{ status: "completed", count: 142, totalAmount: 398200 }, { status: "pending", count: 14, totalAmount: 14600 }] },
          lastSync: { status: "completed", startedAt: new Date(Date.now() - 3600000).toISOString(), finishedAt: new Date(Date.now() - 3540000).toISOString(), summary: "Synced 1248 contacts, 89 companies, 34 deals." },
        },
        performanceSummary: syntheticPerformanceSummary,
        recentTrends: syntheticRecentTrends,
        historicalInsights: syntheticHistoricalInsights,
        monetizationFlags: syntheticMonetizationFlags,
      });

    } else {
      // ===== REAL DATA PATH (existing logic) =====

    // ===== PARALLEL DATA FETCH =====
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const [
      profileRes,
      draftRes,
      competitorsRes,
      socialRes,
      crmConnectionsRes,
      crmContactCountRes,
      crmCompanyCountRes,
      crmDealRes,
      crmOrderRes,
      crmSyncLogRes,
      brandAssetsRes,
      productLinesRes,
      productsRes,
      postAnalyticsRes,
      postQueueRes,
      trendsRes,
      draftsCountRes,
      scheduledRes,
      marketerClientsRes,
      reportRes,
      scheduledReportsRes,
      postHistoryRes,
    ] = await Promise.all([
      supabase.from("client_profiles").select("*").eq("user_id", userId).single(),
      campaignDraftId
        ? supabase.from("campaign_drafts").select("*").eq("id", campaignDraftId).eq("user_id", userId).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("competitor_analyses").select("*").eq("user_id", userId).order("analyzed_at", { ascending: false }).limit(10),
      supabase.from("social_connections").select("platform, platform_username, platform_user_id, scopes, token_expires_at, created_at").eq("user_id", userId),
      supabase.from("crm_connections").select("provider, display_name, status, sync_frequency_minutes, last_sync_at").eq("user_id", userId),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("crm_companies").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("crm_deals").select("stage, value, status").eq("user_id", userId),
      supabase.from("crm_orders").select("status, total_amount").eq("user_id", userId),
      supabase.from("crm_sync_logs").select("status, started_at, finished_at, summary, error_message").order("started_at", { ascending: false }).limit(1),
      supabase.from("brand_assets").select("asset_type, name, value, metadata").eq("user_id", userId),
      supabase.from("product_lines").select("id, name, description").eq("user_id", userId),
      supabaseAdmin.from("products").select("name, short_description, product_type, target_audience, value_propositions").eq("user_id", userId),
      supabase.from("post_analytics").select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate").gte("fetched_at", thirtyDaysAgo),
      supabase.from("post_queue").select("content_type, status").eq("user_id", userId),
      supabase.from("social_trends").select("platform, trend_name, trend_category, trend_volume, trend_rank, trend_url, scraped_at").eq("user_id", userId).order("scraped_at", { ascending: false }).limit(20),
      supabase.from("campaign_drafts").select("id, content_type, tags", { count: "exact" }).eq("user_id", userId),
      supabase.from("scheduled_campaigns").select("status, platforms").eq("user_id", userId),
      supabase.from("marketer_clients").select("client_id, client_name, client_email, status").eq("marketer_id", userId),
      supabase.from("report_results").select("search_term, sentiment, mentions, sources, positive_percent, neutral_percent, negative_percent, summary, generated_at").eq("user_id", userId).order("generated_at", { ascending: false }).limit(1),
      supabase.from("scheduled_reports").select("search_term, schedule_frequency, is_active, next_run_at").eq("user_id", userId),
      // Fetch post history using service role (bypasses RLS for cross-table join)
      supabaseAdmin.from("post_queue")
        .select("id, content_type, status, scheduled_at, published_at, created_at, post_platform_targets(platform, status, platform_post_id, published_at)")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false }),
    ]);

    const profile = profileRes.data;
    const draft = draftRes.data;
    const competitors = competitorsRes.data || [];
    const socialConns = socialRes.data || [];
    const brandAssets = brandAssetsRes.data || [];
    const productLines = productLinesRes.data || [];
    const productsData = productsRes.data || [];
    const analytics = postAnalyticsRes.data || [];
    const postQueue = postQueueRes.data || [];
    const trends = trendsRes.data || [];
    const allDrafts = draftsCountRes.data || [];
    const scheduled = scheduledRes.data || [];
    const clients = marketerClientsRes.data || [];
    const crmDeals = crmDealRes.data || [];
    const crmOrders = crmOrderRes.data || [];

    // ===== BUILD IDENTITY =====
    const identity = {
      userId,
      email: user.email,
      activeClientContext: {
        mode: "my_business",
        clientRosterCount: clients.length,
      },
    };

    // ===== BUILD BRAND =====
    const assetsByType: Record<string, number> = {};
    for (const a of brandAssets) {
      assetsByType[a.asset_type] = (assetsByType[a.asset_type] || 0) + 1;
    }
    const brand = profile ? stripNulls({
      businessName: profile.business_name,
      website: profile.website,
      description: truncate(profile.description),
      industry: profile.industry,
      productCategory: profile.product_category,
      geographyMarkets: profile.geography_markets,
      marketingGoals: truncate(profile.marketing_goals),
      valueProposition: truncate(profile.value_proposition),
      logoUrl: profile.logo_url,
      brandColors: profile.brand_colors,
      mainCompetitors: profile.main_competitors,
      assetsSummary: {
        totalAssets: brandAssets.length,
        byType: assetsByType,
      },
      productLines: productLines.map(p => ({ id: p.id, name: p.name, description: truncate(p.description) })),
    }) : {};

    // ===== BUILD AUDIENCE =====
    const audienceRaw = profile?.audience_data || {};
    const compressed = gzipAndEncode(audienceRaw);
    const audience = stripNulls({
      primaryDescription: profile?.target_audience,
      audienceDataCompressed: compressed.encoded,
      compressedSizeBytes: compressed.sizeBytes,
      wasTruncated: compressed.wasTruncated,
    });

    // ===== BUILD COMPETITORS =====
    const sortedCompetitors = competitors
      .map((c: any) => ({
        name: c.competitor_name,
        url: c.competitor_url,
        description: truncate(c.company_description),
        targetAudience: c.target_audience,
        valueProposition: truncate(c.value_proposition),
        keyProducts: c.key_products,
        pricingStrategy: c.pricing_strategy,
        marketingChannels: c.marketing_channels,
        swot: stripNulls({
          strengths: truncate(c.strengths),
          weaknesses: truncate(c.weaknesses),
          opportunities: truncate(c.opportunities),
          threats: truncate(c.threats),
        }),
        analyzedAt: c.analyzed_at,
        marketSharePercent: 0,
        primaryContentMix: {
          textPercent: 40,
          imagePercent: 30,
          shortFormVideoPercent: 20,
          longFormVideoPercent: 10,
        },
        videoDominant: false,
      }))
      .map((c: any, i: number) => ({
        ...c,
        marketSharePercent: Math.max(5, 30 - i * 5),
        videoDominant: (c.primaryContentMix.shortFormVideoPercent + c.primaryContentMix.longFormVideoPercent) > 50,
      }));

    const competitorsPayload = {
      totalCompetitorCount: competitors.length,
      includedTop: Math.min(5, sortedCompetitors.length),
      selectionBasis: "market_share" as const,
      items: sortedCompetitors.slice(0, 5),
    };

    // ===== BUILD CAMPAIGN =====
    const campaign = draft ? stripNulls({
      id: draft.id,
      idea: truncate(draft.campaign_idea),
      objective: draft.campaign_objective,
      goals: truncate(draft.campaign_goals),
      contentType: draft.content_type,
      postCaption: truncate(draft.post_caption),
      imagePrompt: truncate(draft.image_prompt),
      videoScript: truncate(draft.video_script),
      scenePrompts: truncate(draft.scene_prompts),
      articleOutline: truncate(draft.article_outline),
      targetAudience: draft.target_audience,
      targetAudienceDescription: draft.target_audience_description,
      tags: draft.tags,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    }) : {};

    // ===== BUILD ASSETS =====
    // Filter out base64 data URLs — only send hosted URLs to keep payload small
    const isHostedUrl = (v: string) => v && (v.startsWith("http://") || v.startsWith("https://"));
    const logoAssets = brandAssets.filter(a => a.asset_type === "logo" && isHostedUrl(a.value)).map(a => ({ name: a.name, url: a.value }));
    const colorAssets = brandAssets.filter(a => a.asset_type === "color").map(a => ({ name: a.name, value: a.value }));
    const fontAssets = brandAssets.filter(a => a.asset_type === "font").map(a => ({ name: a.name, value: a.value }));
    const imageAssets = brandAssets.filter(a => a.asset_type === "image" && isHostedUrl(a.value)).map(a => ({ name: a.name, url: a.value }));

    const assets = stripNulls({
      logos: logoAssets.length ? logoAssets : undefined,
      colors: colorAssets.length ? colorAssets : undefined,
      fonts: fontAssets.length ? fontAssets : undefined,
      images: imageAssets.length ? imageAssets : undefined,
      totalAssets: brandAssets.length,
    });

    // ===== BUILD DISTRIBUTION =====
    const connectedPlatforms = socialConns.map((sc: any) => ({
      platform: sc.platform,
      username: sc.platform_username,
      platformUserId: sc.platform_user_id,
      scopes: sc.scopes,
      tokenExpiresAt: sc.token_expires_at,
      connectedAt: sc.created_at,
    }));

    const contentType = draft?.content_type || "visual_post";
    const isVideo = contentType === "social_video" || contentType === "video_ad";
    const perPlatformPostCount = connectedPlatforms.map((p: any) => ({
      platform: p.platform,
      plannedPosts: 1,
      contentTypeMix: {
        video: isVideo ? 1 : 0,
        image: !isVideo && contentType === "visual_post" ? 1 : 0,
        text: contentType === "written" ? 1 : 0,
      },
    }));

    const totalPlannedPosts = perPlatformPostCount.reduce((s: number, p: any) => s + p.plannedPosts, 0);
    const totalVideoPosts = perPlatformPostCount.reduce((s: number, p: any) => s + (p.contentTypeMix.video || 0), 0);

    const distribution = {
      connectedPlatforms,
      publishingPlan: {
        perPlatformPostCount,
        totalPlannedPosts,
      },
    };

    // ===== BUILD CRM SUMMARY =====
    const dealsByStage: Record<string, { count: number; totalValue: number }> = {};
    for (const d of crmDeals) {
      const s = (d as any).stage || "unknown";
      if (!dealsByStage[s]) dealsByStage[s] = { count: 0, totalValue: 0 };
      dealsByStage[s].count++;
      dealsByStage[s].totalValue += Number((d as any).value) || 0;
    }
    const ordersByStatus: Record<string, { count: number; totalAmount: number }> = {};
    for (const o of crmOrders) {
      const s = (o as any).status || "unknown";
      if (!ordersByStatus[s]) ordersByStatus[s] = { count: 0, totalAmount: 0 };
      ordersByStatus[s].count++;
      ordersByStatus[s].totalAmount += Number((o as any).total_amount) || 0;
    }

    const lastSync = crmSyncLogRes.data?.[0];
    const crmSummary = stripNulls({
      connections: (crmConnectionsRes.data || []).map((c: any) => ({
        provider: c.provider,
        displayName: c.display_name,
        status: c.status,
        syncFrequencyMinutes: c.sync_frequency_minutes,
        lastSyncAt: c.last_sync_at,
      })),
      aggregateMetrics: {
        totalContacts: crmContactCountRes.count || 0,
        totalCompanies: crmCompanyCountRes.count || 0,
        totalDeals: crmDeals.length,
        totalOrders: crmOrders.length,
        totalDealValue: crmDeals.reduce((s, d: any) => s + (Number(d.value) || 0), 0),
        totalOrderRevenue: crmOrders.reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0),
        dealsByStage: Object.entries(dealsByStage).map(([stage, v]) => ({ stage, ...v })),
        ordersByStatus: Object.entries(ordersByStatus).map(([status, v]) => ({ status, ...v })),
      },
      lastSync: lastSync ? stripNulls({
        status: lastSync.status,
        startedAt: lastSync.started_at,
        finishedAt: lastSync.finished_at,
        summary: truncate(lastSync.summary),
        errorMessage: truncate(lastSync.error_message),
      }) : undefined,
    });

    // ===== BUILD PERFORMANCE SUMMARY =====
    const platformMetrics: Record<string, any> = {};
    for (const a of analytics) {
      const p = (a as any).platform;
      if (!platformMetrics[p]) {
        platformMetrics[p] = { postCount: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, impressions: 0, reach: 0, engagementRates: [] };
      }
      const m = platformMetrics[p];
      m.postCount++;
      m.views += (a as any).views || 0;
      m.likes += (a as any).likes || 0;
      m.comments += (a as any).comments || 0;
      m.shares += (a as any).shares || 0;
      m.saves += (a as any).saves || 0;
      m.clicks += (a as any).clicks || 0;
      m.impressions += (a as any).impressions || 0;
      m.reach += (a as any).reach || 0;
      if ((a as any).engagement_rate) m.engagementRates.push((a as any).engagement_rate);
    }

    const totalMetrics = {
      totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0,
      totalSaves: 0, totalClicks: 0, totalImpressions: 0, totalReach: 0,
    };
    for (const m of Object.values(platformMetrics) as any[]) {
      totalMetrics.totalViews += m.views;
      totalMetrics.totalLikes += m.likes;
      totalMetrics.totalComments += m.comments;
      totalMetrics.totalShares += m.shares;
      totalMetrics.totalSaves += m.saves;
      totalMetrics.totalClicks += m.clicks;
      totalMetrics.totalImpressions += m.impressions;
      totalMetrics.totalReach += m.reach;
    }

    const avgEngagement = analytics.length > 0
      ? analytics.reduce((s, a: any) => s + (a.engagement_rate || 0), 0) / analytics.length
      : 0;

    const performanceSummary = {
      timeWindow: "last_30_days",
      totalPostsTracked: analytics.length,
      aggregateMetrics: { ...totalMetrics, avgEngagementRate: Math.round(avgEngagement * 100) / 100 },
      byPlatform: Object.entries(platformMetrics).map(([platform, m]: [string, any]) => ({
        platform,
        postCount: m.postCount,
        totalViews: m.views,
        totalLikes: m.likes,
        avgEngagementRate: m.engagementRates.length > 0
          ? Math.round((m.engagementRates.reduce((a: number, b: number) => a + b, 0) / m.engagementRates.length) * 100) / 100
          : 0,
      })),
      brandSentiment: reportRes.data ? stripNulls({
        searchTerm: reportRes.data.search_term,
        sentiment: reportRes.data.sentiment,
        mentions: reportRes.data.mentions,
        sources: reportRes.data.sources,
        positivePercent: reportRes.data.positive_percent,
        neutralPercent: reportRes.data.neutral_percent,
        negativePercent: reportRes.data.negative_percent,
        summary: truncate(reportRes.data.summary),
        generatedAt: reportRes.data.generated_at,
      }) : undefined,
      scheduledReports: (scheduledReportsRes.data || []).map((r: any) => ({
        searchTerm: r.search_term,
        frequency: r.schedule_frequency,
        isActive: r.is_active,
      })),
    };

    // ===== BUILD RECENT TRENDS =====
    const recentTrends = trends.map((t: any) => stripNulls({
      platform: t.platform,
      trendName: t.trend_name,
      category: t.trend_category,
      volume: t.trend_volume,
      rank: t.trend_rank,
      url: t.trend_url,
      scrapedAt: t.scraped_at,
    }));

    // ===== BUILD HISTORICAL INSIGHTS =====
    const contentTypeMix: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const d of allDrafts) {
      const ct = (d as any).content_type || "unknown";
      contentTypeMix[ct] = (contentTypeMix[ct] || 0) + 1;
      for (const tag of ((d as any).tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const statusCounts: Record<string, number> = {};
    for (const p of postQueue) {
      const s = (p as any).status || "unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const platformPublishCounts: Record<string, { published: number; failed: number }> = {};
    for (const s of scheduled) {
      const status = (s as any).status;
      for (const plat of ((s as any).platforms || [])) {
        if (!platformPublishCounts[plat]) platformPublishCounts[plat] = { published: 0, failed: 0 };
        if (status === "published") platformPublishCounts[plat].published++;
        if (status === "failed") platformPublishCounts[plat].failed++;
      }
    }

    const historicalInsights = {
      totalCampaignDrafts: draftsCountRes.count || 0,
      contentTypeMix,
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      publishingHistory: {
        totalPublished: statusCounts["published"] || 0,
        totalFailed: statusCounts["failed"] || 0,
        totalScheduled: statusCounts["scheduled"] || 0,
        platformBreakdown: Object.entries(platformPublishCounts).map(([platform, v]) => ({ platform, ...v })),
      },
    };

    // ===== VIDEO STRATEGY & MONETIZATION =====
    const videoDominantCompetitors = competitorsPayload.items.filter((c: any) => c.videoDominant).length;
    const majorityCompetitorsVideoDominant = videoDominantCompetitors > competitorsPayload.items.length / 2;
    const videoHeavyStrategy = totalVideoPosts > totalPlannedPosts / 2 || majorityCompetitorsVideoDominant;

    const monetizationFlags = {
      videoHeavyStrategy,
      estimatedVideoPosts: totalVideoPosts,
      feeMultiplier: videoHeavyStrategy ? 1.5 : 1.0,
    };

    // ===== BUILD PRODUCTS =====
    const productsPayload = productsData.map((p: any) => stripNulls({
      name: p.name,
      type: p.product_type,
      shortDescription: truncate(p.short_description),
      targetAudience: p.target_audience,
      valuePropositions: p.value_propositions,
    }));

    // ===== BUILD POST HISTORY =====
    const postHistoryPosts = postHistoryRes.data || [];
    const platforms = ["tiktok", "instagram", "twitter", "linkedin", "facebook", "youtube"];
    const postsCountPerPlatform: Record<string, number> = {};
    platforms.forEach(p => {
      postsCountPerPlatform[p] = postHistoryPosts.filter((post: any) =>
        post.post_platform_targets?.some((t: any) => t.platform === p)
      ).length;
    });
    const postHistoryStatusCounts: Record<string, number> = {};
    postHistoryPosts.forEach((post: any) => {
      postHistoryStatusCounts[post.status] = (postHistoryStatusCounts[post.status] || 0) + 1;
    });

    const postHistory = {
      daysBack: 30,
      totalPosts: postHistoryPosts.length,
      postsCountPerPlatform,
      statusCounts: postHistoryStatusCounts,
    };

    // ===== ASSEMBLE FINAL PAYLOAD =====
    campaignContext = stripNulls({
      schemaVersion: "1.0.0",
      identity,
      brand,
      audience,
      competitors: competitorsPayload,
      campaign,
      products: productsPayload.length ? productsPayload : undefined,
      assets,
      distribution,
      postHistory,
      crmSummary,
      performanceSummary,
      recentTrends,
      historicalInsights,
      monetizationFlags,
      callbackUrl: `${supabaseUrl}/functions/v1/zapier-callback`,
    });

    } // end real data path

    console.log("Campaign context assembled, preparing for transmission...");

    // ===== SERIALIZE & HASH =====
    const rawPayloadString = JSON.stringify(campaignContext);
    const rawPayloadSizeBytes = new Blob([rawPayloadString]).size;
    const payloadHash = await computePayloadHash(rawPayloadString);

    // ===== COMPRESS + ENCRYPT (if key available) =====
    let payloadString: string;
    let payloadSizeBytes: number;
    let encrypted = false;

    const encryptedEnvelope = await encryptPayload(rawPayloadString);
    if (encryptedEnvelope) {
      payloadString = JSON.stringify(encryptedEnvelope);
      payloadSizeBytes = new Blob([payloadString]).size;
      encrypted = true;
      console.log(`Payload encrypted: ${rawPayloadSizeBytes} bytes → ${encryptedEnvelope.compressed_size} gzipped → ${encryptedEnvelope.encrypted_size} encrypted → ${payloadSizeBytes} bytes envelope`);
    } else {
      payloadString = rawPayloadString;
      payloadSizeBytes = rawPayloadSizeBytes;
      console.log(`Payload sent as plaintext: ${payloadSizeBytes} bytes`);
    }

    // ===== SEND TO ZAPIER =====
    const sendResult = await sendWithRetry(resolvedWebhookUrl, payloadString, payloadHash, payloadSizeBytes);

    const deliveryLog = {
      webhookDeliveryStatus: sendResult.status >= 200 && sendResult.status < 300 ? "success" : "failed",
      responseCode: sendResult.status,
      responseBody: sendResult.body,
      timestamp: new Date().toISOString(),
      attempts: sendResult.attempts,
      payloadHash,
      payloadSizeBytes,
      rawPayloadSizeBytes,
      encrypted,
      compressionRatio: encrypted && encryptedEnvelope ? Math.round((1 - encryptedEnvelope.compressed_size / rawPayloadSizeBytes) * 100) : 0,
      webhookUrl: resolvedWebhookUrl,
      attemptLogs: sendResult.attemptLogs,
    };

    console.log("Zapier delivery log:", JSON.stringify(deliveryLog));

    return new Response(JSON.stringify({
      success: deliveryLog.webhookDeliveryStatus === "success",
      campaignContext: testMode ? campaignContext : undefined,
      deliveryLog,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in launch-campaign:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

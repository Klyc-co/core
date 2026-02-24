import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

async function sendWithRetry(url: string, payload: any, maxRetries = 3): Promise<{ status: number; body: string; attempts: number }> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.text();
      return { status: response.status, body, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
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

    const { campaignDraftId, webhookUrl, testMode } = await req.json();

    // Resolve webhook URL
    let resolvedWebhookUrl = webhookUrl;
    if (!resolvedWebhookUrl) {
      const { data: driveConn } = await supabase
        .from("google_drive_connections")
        .select("zapier_webhook_url")
        .eq("user_id", user.id)
        .not("zapier_webhook_url", "is", null)
        .limit(1)
        .single();
      resolvedWebhookUrl = driveConn?.zapier_webhook_url;
    }

    if (!resolvedWebhookUrl) {
      return new Response(JSON.stringify({ error: "No Zapier webhook URL configured. Add one in Settings or provide webhookUrl." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ===== PARALLEL DATA FETCH =====
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
      postAnalyticsRes,
      postQueueRes,
      trendsRes,
      draftsCountRes,
      scheduledRes,
      marketerClientsRes,
      reportRes,
      scheduledReportsRes,
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
      supabase.from("post_analytics").select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate").gte("fetched_at", thirtyDaysAgo),
      supabase.from("post_queue").select("content_type, status").eq("user_id", userId),
      supabase.from("social_trends").select("platform, trend_name, trend_category, trend_volume, trend_rank, trend_url, scraped_at").eq("user_id", userId).order("scraped_at", { ascending: false }).limit(20),
      supabase.from("campaign_drafts").select("id, content_type, tags", { count: "exact" }).eq("user_id", userId),
      supabase.from("scheduled_campaigns").select("status, platforms").eq("user_id", userId),
      supabase.from("marketer_clients").select("client_id, client_name, client_email, status").eq("marketer_id", userId),
      supabase.from("report_results").select("search_term, sentiment, mentions, sources, positive_percent, neutral_percent, negative_percent, summary, generated_at").eq("user_id", userId).order("generated_at", { ascending: false }).limit(1),
      supabase.from("scheduled_reports").select("search_term, schedule_frequency, is_active, next_run_at").eq("user_id", userId),
    ]);

    const profile = profileRes.data;
    const draft = draftRes.data;
    const competitors = competitorsRes.data || [];
    const socialConns = socialRes.data || [];
    const brandAssets = brandAssetsRes.data || [];
    const productLines = productLinesRes.data || [];
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
        // Simulated market share ranking (descending by recency as proxy)
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
    const logoAssets = brandAssets.filter(a => a.asset_type === "logo").map(a => ({ name: a.name, url: a.value }));
    const colorAssets = brandAssets.filter(a => a.asset_type === "color").map(a => ({ name: a.name, value: a.value }));
    const fontAssets = brandAssets.filter(a => a.asset_type === "font").map(a => ({ name: a.name, value: a.value }));
    const imageAssets = brandAssets.filter(a => a.asset_type === "image").map(a => ({ name: a.name, url: a.value }));

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

    // Build publishing plan per platform
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

    // ===== ASSEMBLE FINAL PAYLOAD =====
    const campaignContext = stripNulls({
      schemaVersion: "1.0.0",
      identity,
      brand,
      audience,
      competitors: competitorsPayload,
      campaign,
      assets,
      distribution,
      crmSummary,
      performanceSummary,
      recentTrends,
      historicalInsights,
      monetizationFlags,
    });

    console.log("Campaign context assembled, sending to Zapier...");

    // ===== SEND TO ZAPIER =====
    const sendResult = await sendWithRetry(resolvedWebhookUrl, campaignContext);

    const deliveryLog = {
      webhookDeliveryStatus: sendResult.status >= 200 && sendResult.status < 300 ? "success" : "failed",
      responseCode: sendResult.status,
      responseBody: sendResult.body,
      timestamp: new Date().toISOString(),
      attempts: sendResult.attempts,
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

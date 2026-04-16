import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandingData {
  colorScheme?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    textPrimary?: string;
    textSecondary?: string;
  };
  fonts?: Array<{ family: string }>;
  typography?: {
    fontFamilies?: { primary?: string; heading?: string; code?: string };
    fontSizes?: Record<string, string>;
    fontWeights?: Record<string, number>;
  };
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
}

interface PageData {
  markdown?: string;
  html?: string;
  links?: string[];
  branding?: BrandingData;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

interface CrawlStatusResponse {
  success: boolean;
  status: string;
  completed?: number;
  total?: number;
  data?: PageData[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const functionStartTime = Date.now();
    const MAX_FUNCTION_TIME = 110000; // 110s hard limit to stay under 150s
    const isTimeBudgetOk = () => Date.now() - functionStartTime < MAX_FUNCTION_TIME;

    console.log('Starting FAST website scan:', formattedUrl);

    // Create brand import record
    const { data: importRecord, error: importError } = await supabase
      .from('brand_imports')
      .insert({ user_id: user.id, website_url: formattedUrl, status: 'scanning' })
      .select()
      .single();

    if (importError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start import' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== SPEED OPTIMIZATION: Run branding scrape + crawl IN PARALLEL =====
    console.log('Launching branding scrape + crawl in parallel...');

    const [brandingResult, crawlResult] = await Promise.all([
      // Parallel task 1: Homepage branding scrape
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ['branding', 'markdown', 'links'],
          onlyMainContent: false,
        }),
      }).then(r => r.json()).catch(e => ({ success: false, error: e.message })),

      // Parallel task 2: Start crawl (reduced: 5 pages, depth 1)
      fetch('https://api.firecrawl.dev/v1/crawl', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formattedUrl,
          limit: 5,
          maxDepth: 1,
          scrapeOptions: { formats: ['markdown', 'links'], onlyMainContent: true },
        }),
      }).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
    ]);

    // Extract branding from homepage
    let homepageBranding: BrandingData | null = null;
    let homepageData: PageData | null = null;
    if (brandingResult.success) {
      const pageData = brandingResult.data?.data || brandingResult.data;
      homepageBranding = pageData?.branding || brandingResult.branding || null;
      homepageData = pageData || null;
      console.log('Branding extracted:', homepageBranding ? 'Yes' : 'No');
    }

    // Poll crawl with shorter timeout (25s) and faster interval (2s)
    let crawlPages: PageData[] = [];
    if (crawlResult.success && crawlResult.id) {
      const crawlId = crawlResult.id;
      console.log('Crawl started, polling ID:', crawlId);
      const maxWaitTime = 25000;
      const pollInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        try {
          const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          const statusData: CrawlStatusResponse = await statusResponse.json();
          console.log(`Crawl: ${statusData.status} (${statusData.completed}/${statusData.total})`);

          if (statusData.status === 'completed' && statusData.data) {
            crawlPages = statusData.data;
            break;
          } else if (statusData.status === 'failed') {
            break;
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }
    }

    // If crawl failed/timed out but we have homepage data, use that
    const allPages: PageData[] = crawlPages.length > 0
      ? crawlPages
      : (homepageData ? [homepageData] : []);

    console.log(`Processing ${allPages.length} pages`);

    // Process assets
    const assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }> = [];
    const seenValues = new Set<string>();

    if (homepageBranding) {
      extractBrandingAssets(homepageBranding, user.id, importRecord.id, assets, seenValues);
    }

    for (const page of allPages) {
      const pageUrl = page.metadata?.sourceURL || 'Unknown';
      const pageName = page.metadata?.title || pageUrl.split('/').pop() || 'Page';
      if (page.links) extractImageLinks(page.links, user.id, importRecord.id, assets, seenValues, pageName);
      if (page.markdown) {
        extractCopyFromMarkdown(page.markdown, page.metadata, user.id, importRecord.id, assets, seenValues, pageName);
        extractImagesFromMarkdown(page.markdown, user.id, importRecord.id, assets, seenValues, pageName);
      }
    }

    const colorAssets = assets.filter(a => a.asset_type === 'color');
    const fontAssets = assets.filter(a => a.asset_type === 'font');
    const imageAssets = assets.filter(a => a.asset_type === 'image').slice(0, 100);
    const copyAssets = assets.filter(a => a.asset_type === 'copy').slice(0, 50);
    const limitedAssets = [...colorAssets, ...fontAssets, ...imageAssets, ...copyAssets];

    // ===== SPEED: Insert assets + generate AI summary IN PARALLEL =====
    const [, businessSummary] = await Promise.all([
      // Insert assets in background
      (async () => {
        if (limitedAssets.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < limitedAssets.length; i += batchSize) {
            await supabase.from('brand_assets').insert(limitedAssets.slice(i, i + batchSize));
          }
        }
      })(),
      // Generate AI summary (using faster model)
      generateBusinessSummary(allPages, formattedUrl),
    ]);

    // Auto-populate client profile
    const logoUrl = homepageBranding?.logo || homepageBranding?.images?.logo || null;
    const brandColors: string[] = [];
    if (homepageBranding?.colors) {
      for (const val of Object.values(homepageBranding.colors)) {
        if (val && typeof val === 'string') brandColors.push(val);
      }
    }

    const profileUpsert: Record<string, any> = {
      user_id: user.id,
      website: formattedUrl,
      updated_at: new Date().toISOString(),
    };
    if (logoUrl) profileUpsert.logo_url = logoUrl;
    if (brandColors.length > 0) profileUpsert.brand_colors = brandColors;
    if (businessSummary.businessName && businessSummary.businessName !== "Your Business") profileUpsert.business_name = businessSummary.businessName;
    if (businessSummary.description) profileUpsert.description = businessSummary.description;
    if (businessSummary.industry) profileUpsert.industry = businessSummary.industry;
    if (businessSummary.targetAudience) profileUpsert.target_audience = businessSummary.targetAudience;
    if (businessSummary.valueProposition) profileUpsert.value_proposition = businessSummary.valueProposition;
    if (businessSummary.productCategory) profileUpsert.product_category = businessSummary.productCategory;
    if (businessSummary.geographyMarkets) profileUpsert.geography_markets = businessSummary.geographyMarkets;
    if (businessSummary.marketingGoals) profileUpsert.marketing_goals = businessSummary.marketingGoals;
    if (businessSummary.mainCompetitors) profileUpsert.main_competitors = businessSummary.mainCompetitors;
    if (businessSummary.audienceData) profileUpsert.audience_data = businessSummary.audienceData;
    if (businessSummary.valueData) profileUpsert.value_data = businessSummary.valueData;

    // Update profile + import status in parallel
    await Promise.all([
      supabase.from('client_profiles').upsert(profileUpsert, { onConflict: 'user_id' }),
      supabase.from('brand_imports').update({
        status: 'completed',
        metadata: {
          pagesScanned: allPages.length,
          assetsCount: limitedAssets.length,
          colorScheme: homepageBranding?.colorScheme,
          sourceUrl: formattedUrl,
          logoUrl,
        }
      }).eq('id', importRecord.id),
    ]);

    console.log(`Scan complete: ${limitedAssets.length} assets from ${allPages.length} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
        pagesScanned: allPages.length,
        assetsCount: limitedAssets.length,
        businessSummary,
        logoUrl,
        summary: {
          colors: colorAssets.length,
          fonts: fontAssets.length,
          images: imageAssets.length,
          copy: copyAssets.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error scanning website:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scan website' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: extract branding assets
function extractBrandingAssets(
  branding: BrandingData, userId: string, importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>
) {
  if (branding.colors) {
    const colorNames = ['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'] as const;
    for (const colorName of colorNames) {
      const colorValue = branding.colors[colorName];
      if (colorValue && !seenValues.has(colorValue)) {
        seenValues.add(colorValue);
        assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'color', name: colorName.charAt(0).toUpperCase() + colorName.slice(1).replace(/([A-Z])/g, ' $1'), value: colorValue, metadata: { source: 'branding' } });
      }
    }
  }
  if (branding.fonts) {
    for (const font of branding.fonts) {
      if (font.family && !seenValues.has(`font:${font.family}`)) {
        seenValues.add(`font:${font.family}`);
        assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'font', name: font.family, value: font.family, metadata: { source: 'branding' } });
      }
    }
  }
  if (branding.typography?.fontFamilies) {
    const families = branding.typography.fontFamilies;
    for (const fontType of ['primary', 'heading', 'code'] as const) {
      const family = families[fontType];
      if (family && !seenValues.has(`font:${family}`)) {
        seenValues.add(`font:${family}`);
        assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'font', name: `${fontType.charAt(0).toUpperCase() + fontType.slice(1)} Font`, value: family, metadata: { source: 'typography', type: fontType } });
      }
    }
  }
  if (branding.images) {
    for (const imageType of ['logo', 'favicon', 'ogImage'] as const) {
      const imageUrl = branding.images[imageType];
      if (imageUrl && !seenValues.has(imageUrl)) {
        seenValues.add(imageUrl);
        assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'image', name: imageType.charAt(0).toUpperCase() + imageType.slice(1).replace(/([A-Z])/g, ' $1'), value: imageUrl, metadata: { source: 'branding', type: imageType } });
      }
    }
  }
  if (branding.logo && !seenValues.has(branding.logo)) {
    seenValues.add(branding.logo);
    assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'image', name: 'Logo', value: branding.logo, metadata: { source: 'branding', type: 'logo' } });
  }
}

// Helper: extract image links
function extractImageLinks(
  links: string[], userId: string, importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>, pageName: string
) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.avif'];
  for (const link of links) {
    const lowerLink = link.toLowerCase();
    if (imageExtensions.some(ext => lowerLink.includes(ext)) && !seenValues.has(link)) {
      seenValues.add(link);
      const fileName = link.split('/').pop()?.split('?')[0] || 'Image';
      assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'image', name: fileName.length > 50 ? `Image from ${pageName}` : fileName, value: link, metadata: { source: 'links', page: pageName } });
    }
  }
}

// Helper: extract copy from markdown
function extractCopyFromMarkdown(
  markdown: string, metadata: { title?: string; description?: string } | undefined,
  userId: string, importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>, pageName: string
) {
  if (metadata?.title && !seenValues.has(`title:${metadata.title}`)) {
    seenValues.add(`title:${metadata.title}`);
    assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'copy', name: `${pageName} - Title`, value: metadata.title, metadata: { source: 'metadata', page: pageName } });
  }
  if (metadata?.description && !seenValues.has(`desc:${metadata.description}`)) {
    seenValues.add(`desc:${metadata.description}`);
    assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'copy', name: `${pageName} - Description`, value: metadata.description, metadata: { source: 'metadata', page: pageName } });
  }
  const headings = markdown.match(/^#{1,3}\s+(.+)$/gm) || [];
  for (let i = 0; i < Math.min(headings.length, 3); i++) {
    const heading = headings[i].replace(/^#+\s+/, '').trim();
    if (heading.length > 5 && heading.length < 200 && !seenValues.has(`heading:${heading}`)) {
      seenValues.add(`heading:${heading}`);
      assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'copy', name: `${pageName} - Heading`, value: heading, metadata: { source: 'content', page: pageName } });
    }
  }
}

// Helper: extract images from markdown
function extractImagesFromMarkdown(
  markdown: string, userId: string, importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>, pageName: string
) {
  const imageMatches = markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
  for (const match of imageMatches) {
    const altText = match[1] || 'Image';
    const imageUrl = match[2];
    if (imageUrl && !seenValues.has(imageUrl) && imageUrl.startsWith('http')) {
      seenValues.add(imageUrl);
      assets.push({ user_id: userId, brand_import_id: importId, asset_type: 'image', name: altText.length > 50 ? `Image from ${pageName}` : altText, value: imageUrl, metadata: { source: 'content', page: pageName } });
    }
  }
}

// Generate business summary using FAST AI model
async function generateBusinessSummary(
  pages: PageData[], websiteUrl: string
): Promise<{
  businessName: string; description: string; industry?: string; targetAudience?: string;
  valueProposition?: string; productCategory?: string; geographyMarkets?: string;
  marketingGoals?: string; mainCompetitors?: string;
  audienceData?: Record<string, any>; valueData?: Record<string, any>;
}> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return { businessName: "Your Business", description: "" };

    let combinedContent = "";
    for (const page of pages.slice(0, 10)) {
      const title = page.metadata?.title || "";
      const desc = page.metadata?.description || "";
      const markdown = (page.markdown || "").substring(0, 2000);
      combinedContent += `--- Page: ${title} ---\n${desc}\n${markdown}\n\n`;
      if (combinedContent.length > 12000) break;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a business analyst. Given website content, extract a comprehensive business profile. Return the company name, a detailed description (7-10 sentences), and fill in as many profile fields as possible. Be specific.

For industry, use standard categories like "Technology", "Healthcare", "E-commerce", etc.
For targetAudience, describe who their customers are.
For valueProposition, describe what makes them unique.

AUDIENCE DATA: audienceType (B2C/B2B/B2B2C), mainAudienceSummary, secondaryAudiences, ageRange [number], incomeLevel, geographicFocus, coreValuesInterests, lifestyleSummary, purchaseFrequency, preferredChannels, commonObjections.

VALUE DATA: corePromise, elevatorPitch, customerPainPoints, howWeSolveIt, benefitFocus, uniqueValueDrivers, proofPoints.`,
          },
          { role: "user", content: `Website: ${websiteUrl}\n\n${combinedContent}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_business_summary",
            description: "Create business profile from website content",
            parameters: {
              type: "object",
              properties: {
                businessName: { type: "string" },
                description: { type: "string" },
                industry: { type: "string" },
                targetAudience: { type: "string" },
                valueProposition: { type: "string" },
                productCategory: { type: "string" },
                geographyMarkets: { type: "string" },
                marketingGoals: { type: "string" },
                mainCompetitors: { type: "string" },
                audienceData: { type: "object", properties: { audienceType: { type: "string" }, mainAudienceSummary: { type: "string" }, secondaryAudiences: { type: "string" }, ageRange: { type: "array", items: { type: "number" } }, incomeLevel: { type: "string" }, geographicFocus: { type: "string" }, coreValuesInterests: { type: "string" }, lifestyleSummary: { type: "string" }, purchaseFrequency: { type: "string" }, preferredChannels: { type: "string" }, commonObjections: { type: "string" } } },
                valueData: { type: "object", properties: { corePromise: { type: "string" }, elevatorPitch: { type: "string" }, customerPainPoints: { type: "string" }, howWeSolveIt: { type: "string" }, benefitFocus: { type: "string" }, uniqueValueDrivers: { type: "string" }, proofPoints: { type: "string" } } },
              },
              required: ["businessName", "description"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_business_summary" } },
      }),
    });

    if (!response.ok) return { businessName: "Your Business", description: "" };

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return { businessName: "Your Business", description: "" };

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Summary generated for:", result.businessName);
    return result;
  } catch (e) {
    console.error("Summary error:", e);
    return { businessName: "Your Business", description: "" };
  }
}

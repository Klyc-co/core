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

    // Get Firecrawl API key
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl is not configured. Please connect Firecrawl in settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Starting full website crawl:', formattedUrl);

    // Create brand import record
    const { data: importRecord, error: importError } = await supabase
      .from('brand_imports')
      .insert({
        user_id: user.id,
        website_url: formattedUrl,
        status: 'scanning'
      })
      .select()
      .single();

    if (importError) {
      console.error('Failed to create import record:', importError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start import' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: First scrape the homepage with branding to get brand identity
    console.log('Step 1: Scraping homepage for brand identity...');
    const brandingResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['branding', 'links'],
        onlyMainContent: false,
      }),
    });

    const brandingData = await brandingResponse.json();
    let homepageBranding: BrandingData | null = null;
    
    if (brandingResponse.ok && brandingData.success) {
      // Firecrawl v1 nests data inside data.data for scrape responses
      const pageData = brandingData.data?.data || brandingData.data;
      homepageBranding = pageData?.branding || brandingData.branding || null;
      console.log('Homepage branding response:', JSON.stringify(brandingData, null, 2).substring(0, 500));
      console.log('Extracted branding:', homepageBranding ? 'Found' : 'Not found');
      if (homepageBranding?.colors) {
        console.log('Colors found:', Object.keys(homepageBranding.colors));
      }
      if (homepageBranding?.fonts) {
        console.log('Fonts found:', homepageBranding.fonts.length);
      }
    } else {
      console.error('Branding scrape failed:', brandingData.error || 'Unknown error');
    }

    // Step 2: Start a crawl to get all pages
    console.log('Step 2: Starting website crawl...');
    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        limit: 50, // Crawl up to 50 pages
        maxDepth: 3, // Go 3 levels deep
        scrapeOptions: {
          formats: ['markdown', 'links'],
          onlyMainContent: false,
        },
      }),
    });

    const crawlData = await crawlResponse.json();

    if (!crawlResponse.ok || !crawlData.success) {
      console.error('Crawl initiation failed:', crawlData);
      // Fall back to single page scrape
      return await handleSinglePageFallback(supabase, user.id, importRecord.id, formattedUrl, apiKey, homepageBranding);
    }

    const crawlId = crawlData.id;
    console.log('Crawl started with ID:', crawlId);

    // Step 3: Poll for crawl completion (with timeout)
    let crawlResult: CrawlStatusResponse | null = null;
    const maxWaitTime = 120000; // 2 minutes max
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const statusData: CrawlStatusResponse = await statusResponse.json();
      console.log(`Crawl status: ${statusData.status}, completed: ${statusData.completed}/${statusData.total}`);

      if (statusData.status === 'completed') {
        crawlResult = statusData;
        break;
      } else if (statusData.status === 'failed') {
        console.error('Crawl failed:', statusData);
        break;
      }
    }

    if (!crawlResult || !crawlResult.data) {
      console.log('Crawl timed out or failed, falling back to single page');
      return await handleSinglePageFallback(supabase, user.id, importRecord.id, formattedUrl, apiKey, homepageBranding);
    }

    console.log(`Crawl completed: ${crawlResult.data.length} pages scraped`);

    // Step 4: Process all pages and extract assets
    const assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }> = [];
    const seenValues = new Set<string>();

    // Add branding assets from homepage
    if (homepageBranding) {
      extractBrandingAssets(homepageBranding, user.id, importRecord.id, assets, seenValues);
    }

    // Process each crawled page
    for (const page of crawlResult.data) {
      const pageUrl = page.metadata?.sourceURL || 'Unknown Page';
      const pageName = page.metadata?.title || pageUrl.split('/').pop() || 'Page';
      
      // Extract images from links
      if (page.links) {
        extractImageLinks(page.links, user.id, importRecord.id, assets, seenValues, pageName);
      }

      // Extract copy from markdown
      if (page.markdown) {
        extractCopyFromMarkdown(page.markdown, page.metadata, user.id, importRecord.id, assets, seenValues, pageName);
      }

      // Extract images from markdown (img tags converted to markdown)
      if (page.markdown) {
        extractImagesFromMarkdown(page.markdown, user.id, importRecord.id, assets, seenValues, pageName);
      }
    }

    // Limit total assets to prevent overwhelming the database
    const colorAssets = assets.filter(a => a.asset_type === 'color');
    const fontAssets = assets.filter(a => a.asset_type === 'font');
    const imageAssets = assets.filter(a => a.asset_type === 'image').slice(0, 100); // Max 100 images
    const copyAssets = assets.filter(a => a.asset_type === 'copy').slice(0, 50); // Max 50 copy items
    
    const limitedAssets = [...colorAssets, ...fontAssets, ...imageAssets, ...copyAssets];

    // Insert assets
    if (limitedAssets.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < limitedAssets.length; i += batchSize) {
        const batch = limitedAssets.slice(i, i + batchSize);
        const { error: assetsError } = await supabase
          .from('brand_assets')
          .insert(batch);
        if (assetsError) {
          console.error('Failed to insert assets batch:', assetsError);
        }
      }
    }

    // Step 5: Generate AI business summary from crawled content
    const businessSummary = await generateBusinessSummary(
      crawlResult.data,
      formattedUrl
    );

    // Update import status
    await supabase
      .from('brand_imports')
      .update({ 
        status: 'completed',
        metadata: {
          pagesScanned: crawlResult.data.length,
          assetsCount: limitedAssets.length,
          colorScheme: homepageBranding?.colorScheme,
          sourceUrl: formattedUrl
        }
      })
      .eq('id', importRecord.id);

    console.log(`Full website import completed: ${limitedAssets.length} assets from ${crawlResult.data.length} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
        pagesScanned: crawlResult.data.length,
        assetsCount: limitedAssets.length,
        businessSummary,
        summary: {
          colors: colorAssets.length,
          fonts: fontAssets.length,
          images: imageAssets.length,
          copy: copyAssets.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scanning website:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan website';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract branding assets
function extractBrandingAssets(
  branding: BrandingData,
  userId: string,
  importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>
) {
  // Extract colors
  if (branding.colors) {
    const colorNames = ['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'] as const;
    for (const colorName of colorNames) {
      const colorValue = branding.colors[colorName];
      if (colorValue && !seenValues.has(colorValue)) {
        seenValues.add(colorValue);
        assets.push({
          user_id: userId,
          brand_import_id: importId,
          asset_type: 'color',
          name: colorName.charAt(0).toUpperCase() + colorName.slice(1).replace(/([A-Z])/g, ' $1'),
          value: colorValue,
          metadata: { source: 'branding' }
        });
      }
    }
  }

  // Extract fonts
  if (branding.fonts) {
    for (const font of branding.fonts) {
      if (font.family && !seenValues.has(`font:${font.family}`)) {
        seenValues.add(`font:${font.family}`);
        assets.push({
          user_id: userId,
          brand_import_id: importId,
          asset_type: 'font',
          name: font.family,
          value: font.family,
          metadata: { source: 'branding' }
        });
      }
    }
  }

  // Typography fonts
  if (branding.typography?.fontFamilies) {
    const families = branding.typography.fontFamilies;
    const fontTypes = ['primary', 'heading', 'code'] as const;
    for (const fontType of fontTypes) {
      const family = families[fontType];
      if (family && !seenValues.has(`font:${family}`)) {
        seenValues.add(`font:${family}`);
        assets.push({
          user_id: userId,
          brand_import_id: importId,
          asset_type: 'font',
          name: `${fontType.charAt(0).toUpperCase() + fontType.slice(1)} Font`,
          value: family,
          metadata: { source: 'typography', type: fontType }
        });
      }
    }
  }

  // Extract images (logo, favicon, og image)
  if (branding.images) {
    const imageTypes = ['logo', 'favicon', 'ogImage'] as const;
    for (const imageType of imageTypes) {
      const imageUrl = branding.images[imageType];
      if (imageUrl && !seenValues.has(imageUrl)) {
        seenValues.add(imageUrl);
        assets.push({
          user_id: userId,
          brand_import_id: importId,
          asset_type: 'image',
          name: imageType.charAt(0).toUpperCase() + imageType.slice(1).replace(/([A-Z])/g, ' $1'),
          value: imageUrl,
          metadata: { source: 'branding', type: imageType }
        });
      }
    }
  }

  // Top-level logo
  if (branding.logo && !seenValues.has(branding.logo)) {
    seenValues.add(branding.logo);
    assets.push({
      user_id: userId,
      brand_import_id: importId,
      asset_type: 'image',
      name: 'Logo',
      value: branding.logo,
      metadata: { source: 'branding', type: 'logo' }
    });
  }
}

// Helper function to extract images from links
function extractImageLinks(
  links: string[],
  userId: string,
  importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>,
  pageName: string
) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.avif'];
  
  for (const link of links) {
    const lowerLink = link.toLowerCase();
    if (imageExtensions.some(ext => lowerLink.includes(ext)) && !seenValues.has(link)) {
      seenValues.add(link);
      const fileName = link.split('/').pop()?.split('?')[0] || 'Image';
      assets.push({
        user_id: userId,
        brand_import_id: importId,
        asset_type: 'image',
        name: fileName.length > 50 ? `Image from ${pageName}` : fileName,
        value: link,
        metadata: { source: 'links', page: pageName }
      });
    }
  }
}

// Helper function to extract copy from markdown
function extractCopyFromMarkdown(
  markdown: string,
  metadata: { title?: string; description?: string } | undefined,
  userId: string,
  importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>,
  pageName: string
) {
  // Page title
  if (metadata?.title && !seenValues.has(`title:${metadata.title}`)) {
    seenValues.add(`title:${metadata.title}`);
    assets.push({
      user_id: userId,
      brand_import_id: importId,
      asset_type: 'copy',
      name: `${pageName} - Title`,
      value: metadata.title,
      metadata: { source: 'metadata', page: pageName }
    });
  }

  // Meta description
  if (metadata?.description && !seenValues.has(`desc:${metadata.description}`)) {
    seenValues.add(`desc:${metadata.description}`);
    assets.push({
      user_id: userId,
      brand_import_id: importId,
      asset_type: 'copy',
      name: `${pageName} - Description`,
      value: metadata.description,
      metadata: { source: 'metadata', page: pageName }
    });
  }

  // Extract headings
  const headings = markdown.match(/^#{1,3}\s+(.+)$/gm) || [];
  for (let i = 0; i < Math.min(headings.length, 3); i++) {
    const heading = headings[i].replace(/^#+\s+/, '').trim();
    if (heading.length > 5 && heading.length < 200 && !seenValues.has(`heading:${heading}`)) {
      seenValues.add(`heading:${heading}`);
      assets.push({
        user_id: userId,
        brand_import_id: importId,
        asset_type: 'copy',
        name: `${pageName} - Heading`,
        value: heading,
        metadata: { source: 'content', page: pageName }
      });
    }
  }
}

// Helper function to extract images from markdown content
function extractImagesFromMarkdown(
  markdown: string,
  userId: string,
  importId: string,
  assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }>,
  seenValues: Set<string>,
  pageName: string
) {
  // Match markdown image syntax: ![alt](url)
  const imageMatches = markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
  
  for (const match of imageMatches) {
    const altText = match[1] || 'Image';
    const imageUrl = match[2];
    
    if (imageUrl && !seenValues.has(imageUrl) && imageUrl.startsWith('http')) {
      seenValues.add(imageUrl);
      assets.push({
        user_id: userId,
        brand_import_id: importId,
        asset_type: 'image',
        name: altText.length > 50 ? `Image from ${pageName}` : altText,
        value: imageUrl,
        metadata: { source: 'content', page: pageName }
      });
    }
  }
}

// Fallback to single page scrape if crawl fails
async function handleSinglePageFallback(
  supabase: any,
  userId: string,
  importId: string,
  url: string,
  apiKey: string,
  existingBranding: BrandingData | null
) {
  console.log('Falling back to single page scrape...');
  
  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'branding', 'links'],
      onlyMainContent: false,
    }),
  });

  const scrapeData = await scrapeResponse.json();

  if (!scrapeResponse.ok || !scrapeData.success) {
    await supabase
      .from('brand_imports')
      .update({ status: 'failed', metadata: { error: scrapeData.error || 'Scrape failed' } })
      .eq('id', importId);

    return new Response(
      JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape website' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }> = [];
  const seenValues = new Set<string>();
  const branding = existingBranding || scrapeData.data?.branding;

  if (branding) {
    extractBrandingAssets(branding, userId, importId, assets, seenValues);
  }

  if (scrapeData.data?.links) {
    extractImageLinks(scrapeData.data.links, userId, importId, assets, seenValues, 'Homepage');
  }

  if (scrapeData.data?.markdown) {
    extractCopyFromMarkdown(scrapeData.data.markdown, scrapeData.data.metadata, userId, importId, assets, seenValues, 'Homepage');
    extractImagesFromMarkdown(scrapeData.data.markdown, userId, importId, assets, seenValues, 'Homepage');
  }

  const limitedAssets = assets.slice(0, 100);

  if (limitedAssets.length > 0) {
    const { error: assetsError } = await supabase
      .from('brand_assets')
      .insert(limitedAssets);

    if (assetsError) {
      console.error('Failed to insert assets:', assetsError);
    }
  }

  await supabase
    .from('brand_imports')
    .update({ 
      status: 'completed',
      metadata: {
        pagesScanned: 1,
        assetsCount: limitedAssets.length,
        colorScheme: branding?.colorScheme,
        sourceUrl: url,
        fallback: true
      }
    })
    .eq('id', importId);

  return new Response(
    JSON.stringify({
      success: true,
      importId,
      pagesScanned: 1,
      assetsCount: limitedAssets.length,
      summary: {
        colors: limitedAssets.filter(a => a.asset_type === 'color').length,
        fonts: limitedAssets.filter(a => a.asset_type === 'font').length,
        images: limitedAssets.filter(a => a.asset_type === 'image').length,
        copy: limitedAssets.filter(a => a.asset_type === 'copy').length,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

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

interface ScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    branding?: BrandingData;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
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

    // Get Firecrawl API key - check both possible names
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

    console.log('Scanning website:', formattedUrl);

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

    // Scrape website with Firecrawl - get branding, links, and markdown
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'branding', 'links'],
        onlyMainContent: false,
      }),
    });

    const scrapeData: ScrapeResponse = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl error:', scrapeData);
      await supabase
        .from('brand_imports')
        .update({ status: 'failed', metadata: { error: scrapeData.error || 'Scrape failed' } })
        .eq('id', importRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape website' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful, processing assets...');

    const assets: Array<{ user_id: string; brand_import_id: string; asset_type: string; name: string; value: string; metadata: Record<string, unknown> }> = [];
    const branding = scrapeData.data?.branding;
    const markdown = scrapeData.data?.markdown || '';
    const metadata = scrapeData.data?.metadata || {};

    // Extract colors
    if (branding?.colors) {
      const colorNames = ['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'] as const;
      for (const colorName of colorNames) {
        const colorValue = branding.colors[colorName];
        if (colorValue) {
          assets.push({
            user_id: user.id,
            brand_import_id: importRecord.id,
            asset_type: 'color',
            name: colorName.charAt(0).toUpperCase() + colorName.slice(1).replace(/([A-Z])/g, ' $1'),
            value: colorValue,
            metadata: { source: 'branding' }
          });
        }
      }
    }

    // Extract fonts
    if (branding?.fonts) {
      for (const font of branding.fonts) {
        if (font.family) {
          assets.push({
            user_id: user.id,
            brand_import_id: importRecord.id,
            asset_type: 'font',
            name: font.family,
            value: font.family,
            metadata: { source: 'branding' }
          });
        }
      }
    }

    // Also extract from typography
    if (branding?.typography?.fontFamilies) {
      const families = branding.typography.fontFamilies;
      const fontTypes = ['primary', 'heading', 'code'] as const;
      for (const fontType of fontTypes) {
        const family = families[fontType];
        if (family && !assets.some(a => a.asset_type === 'font' && a.value === family)) {
          assets.push({
            user_id: user.id,
            brand_import_id: importRecord.id,
            asset_type: 'font',
            name: `${fontType.charAt(0).toUpperCase() + fontType.slice(1)} Font`,
            value: family,
            metadata: { source: 'typography', type: fontType }
          });
        }
      }
    }

    // Extract images (logo, favicon, og image)
    if (branding?.images) {
      const imageTypes = ['logo', 'favicon', 'ogImage'] as const;
      for (const imageType of imageTypes) {
        const imageUrl = branding.images[imageType];
        if (imageUrl) {
          assets.push({
            user_id: user.id,
            brand_import_id: importRecord.id,
            asset_type: 'image',
            name: imageType.charAt(0).toUpperCase() + imageType.slice(1).replace(/([A-Z])/g, ' $1'),
            value: imageUrl,
            metadata: { source: 'branding', type: imageType }
          });
        }
      }
    }

    // Also check top-level logo
    if (branding?.logo && !assets.some(a => a.value === branding.logo)) {
      assets.push({
        user_id: user.id,
        brand_import_id: importRecord.id,
        asset_type: 'image',
        name: 'Logo',
        value: branding.logo,
        metadata: { source: 'branding', type: 'logo' }
      });
    }

    // Extract copy from markdown - get title, description, and first few paragraphs
    if (metadata.title) {
      assets.push({
        user_id: user.id,
        brand_import_id: importRecord.id,
        asset_type: 'copy',
        name: 'Page Title',
        value: metadata.title,
        metadata: { source: 'metadata' }
      });
    }

    if (metadata.description) {
      assets.push({
        user_id: user.id,
        brand_import_id: importRecord.id,
        asset_type: 'copy',
        name: 'Meta Description',
        value: metadata.description,
        metadata: { source: 'metadata' }
      });
    }

    // Extract headings and paragraphs from markdown
    const headings = markdown.match(/^#{1,3}\s+(.+)$/gm) || [];
    for (let i = 0; i < Math.min(headings.length, 5); i++) {
      const heading = headings[i].replace(/^#+\s+/, '');
      if (heading.length > 5 && heading.length < 200) {
        assets.push({
          user_id: user.id,
          brand_import_id: importRecord.id,
          asset_type: 'copy',
          name: `Heading ${i + 1}`,
          value: heading,
          metadata: { source: 'content' }
        });
      }
    }

    // Extract links that might be images
    const links = scrapeData.data?.links || [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];
    for (const link of links) {
      const lowerLink = link.toLowerCase();
      if (imageExtensions.some(ext => lowerLink.includes(ext))) {
        // Only add if not already added
        if (!assets.some(a => a.value === link)) {
          const fileName = link.split('/').pop() || 'Image';
          assets.push({
            user_id: user.id,
            brand_import_id: importRecord.id,
            asset_type: 'image',
            name: fileName.length > 50 ? 'Website Image' : fileName,
            value: link,
            metadata: { source: 'links' }
          });
        }
      }
    }

    // Limit images to prevent too many
    const imageAssets = assets.filter(a => a.asset_type === 'image');
    const otherAssets = assets.filter(a => a.asset_type !== 'image');
    const limitedAssets = [...otherAssets, ...imageAssets.slice(0, 20)];

    // Insert assets
    if (limitedAssets.length > 0) {
      const { error: assetsError } = await supabase
        .from('brand_assets')
        .insert(limitedAssets);

      if (assetsError) {
        console.error('Failed to insert assets:', assetsError);
      }
    }

    // Update import status
    await supabase
      .from('brand_imports')
      .update({ 
        status: 'completed',
        metadata: {
          assetsCount: limitedAssets.length,
          colorScheme: branding?.colorScheme,
          sourceUrl: metadata.sourceURL
        }
      })
      .eq('id', importRecord.id);

    console.log(`Import completed: ${limitedAssets.length} assets extracted`);

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
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

  } catch (error) {
    console.error('Error scanning website:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan website';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
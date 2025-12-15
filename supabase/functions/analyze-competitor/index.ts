import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const { competitorName, competitorUrl } = await req.json();

    if (!competitorName) {
      return new Response(JSON.stringify({ error: 'Missing competitor name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing competitor: ${competitorName}, URL: ${competitorUrl || 'N/A'}, User: ${userId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Gather data via Firecrawl
    let scrapedData: any[] = [];
    
    // If URL provided, scrape it directly
    if (competitorUrl && FIRECRAWL_API_KEY) {
      try {
        console.log('Scraping competitor URL...');
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: competitorUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          if (scrapeData.success && scrapeData.markdown) {
            scrapedData.push({
              source: 'website',
              url: competitorUrl,
              content: scrapeData.markdown.substring(0, 10000),
            });
          }
        }
      } catch (e) {
        console.error('Scrape error:', e);
      }
    }

    // Also search for competitor info
    if (FIRECRAWL_API_KEY) {
      try {
        console.log('Searching for competitor info...');
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${competitorName} company products pricing reviews`,
            limit: 8,
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && Array.isArray(searchData.data)) {
            searchData.data.forEach((result: any) => {
              scrapedData.push({
                source: 'search',
                title: result.title,
                url: result.url,
                description: result.description,
              });
            });
          }
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }

    console.log(`Gathered ${scrapedData.length} data sources`);

    // Step 2: Analyze with AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataContext = scrapedData.map(d => {
      if (d.source === 'website') {
        return `Website Content:\n${d.content}`;
      }
      return `${d.title}\nURL: ${d.url}\n${d.description || ''}`;
    }).join('\n\n---\n\n');

    const analysisPrompt = `You are a competitive intelligence analyst. Analyze this competitor and provide a comprehensive analysis.

Competitor: ${competitorName}
${competitorUrl ? `Website: ${competitorUrl}` : ''}

Data gathered:
${dataContext || 'No specific data available - use your knowledge about this company.'}

Provide analysis in this exact JSON format:
{
  "company_description": "2-3 sentence description of what the company does",
  "target_audience": "Who they target - demographics, industries, company sizes",
  "value_proposition": "Their main value proposition and unique selling points",
  "key_products": "Main products or services they offer",
  "pricing_strategy": "Their pricing approach - premium, budget, freemium, etc.",
  "marketing_channels": "Where they market - social media, content, paid ads, etc.",
  "strengths": "3-5 bullet points of their strengths",
  "weaknesses": "3-5 bullet points of their weaknesses or gaps",
  "opportunities": "2-3 opportunities you could exploit against them",
  "threats": "2-3 threats they pose to your business"
}

Return ONLY valid JSON, no markdown or extra text.`;

    console.log('Calling AI for analysis...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a competitive intelligence analyst. Always respond with valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Response:', analysisText);
      analysis = {
        company_description: 'Analysis could not be fully parsed.',
        target_audience: 'Unknown',
        value_proposition: 'Unknown',
        key_products: 'Unknown',
        pricing_strategy: 'Unknown',
        marketing_channels: 'Unknown',
        strengths: 'Analysis pending',
        weaknesses: 'Analysis pending',
        opportunities: 'Analysis pending',
        threats: 'Analysis pending',
      };
    }

    // Step 3: Save to database
    const { data: savedAnalysis, error: insertError } = await supabase
      .from('competitor_analyses')
      .insert({
        user_id: userId,
        competitor_name: competitorName,
        competitor_url: competitorUrl || null,
        company_description: analysis.company_description,
        target_audience: analysis.target_audience,
        value_proposition: analysis.value_proposition,
        key_products: analysis.key_products,
        pricing_strategy: analysis.pricing_strategy,
        marketing_channels: analysis.marketing_channels,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        opportunities: analysis.opportunities,
        threats: analysis.threats,
        raw_data: scrapedData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save analysis' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analysis saved:', savedAnalysis.id);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: savedAnalysis,
      sourcesCount: scrapedData.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in analyze-competitor:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

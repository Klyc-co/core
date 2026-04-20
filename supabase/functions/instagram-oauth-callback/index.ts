import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Get frontend URL for redirects
  const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://idea-to-idiom.lovable.app";

  if (error) {
    console.error("Instagram OAuth error:", error, errorDescription);
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=${encodeURIComponent(errorDescription || error)}`,
      302
    );
  }

  if (!code || !state) {
    console.error("Missing code or state parameter");
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=Missing+authorization+code`,
      302
    );
  }

  try {
    // Decode the state to get user_id and return path
    const decodedState = JSON.parse(atob(state));
    const userId = decodedState.user_id;
    const returnPath: string = (typeof decodedState.return_path === "string" && decodedState.return_path.startsWith("/"))
      ? decodedState.return_path
      : "/campaigns/new";

    if (!userId) {
      throw new Error("Invalid state: missing user_id");
    }

    // Get credentials
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Client ID present:", !!clientId);
    console.log("Client Secret length:", clientSecret?.length || 0);
    console.log("Client Secret first 4 chars:", clientSecret?.substring(0, 4) || "N/A");

    if (!clientId || !clientSecret) {
      throw new Error("Instagram credentials not configured");
    }

    // Must match the redirect_uri used in instagram-auth-url exactly,
    // otherwise Facebook rejects the token exchange.
    const redirectUri = "https://klyc.ai/oauth/instagram/callback";

    // Exchange code for Facebook access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`,
      { method: "GET" }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Facebook access token obtained successfully");

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${tokenData.access_token}`,
      { method: "GET" }
    );

    let accessToken = tokenData.access_token;
    let expiresIn = 3600;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // ~60 days
      console.log("Long-lived token obtained successfully");
    }

    // First, let's check what permissions were actually granted
    const debugResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
    );
    if (debugResponse.ok) {
      const permData = await debugResponse.json();
      console.log("Granted permissions:", JSON.stringify(permData.data));
    }

    // Get the user's Facebook Pages - try multiple endpoints for different Page types
    let pagesData: { data: any[] } = { data: [] };
    
    // First try standard me/accounts
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    const pagesResponseText = await pagesResponse.text();
    console.log("Pages API raw response:", pagesResponseText);

    if (pagesResponse.ok) {
      pagesData = JSON.parse(pagesResponseText);
    }

    // If no pages found, try the business endpoint for New Pages Experience
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log("No pages from me/accounts, trying me/businesses...");
      
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
      );
      
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        console.log("Businesses found:", businessData.data?.length || 0);
        
        // For each business, get the pages
        for (const business of businessData.data || []) {
          const bizPagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${business.id}/owned_pages?access_token=${accessToken}`
          );
          if (bizPagesResponse.ok) {
            const bizPagesData = await bizPagesResponse.json();
            console.log(`Business ${business.id} pages:`, bizPagesData.data?.length || 0);
            if (bizPagesData.data) {
              pagesData.data = [...pagesData.data, ...bizPagesData.data];
            }
          }
        }
      }
    }

    console.log("Total Facebook pages found:", pagesData.data?.length || 0);

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error("No Facebook Pages found. Your Page may require 'business_management' permission or you need to be an Admin of the Page.");
    }

    // Get the Instagram Business Account ID from the first page
    let instagramAccountId = null;
    let instagramUsername = null;
    let pageAccessToken = null;

    for (const page of pagesData.data) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );

      if (igResponse.ok) {
        const igData = await igResponse.json();
        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id;
          pageAccessToken = page.access_token;
          
          // Get Instagram username
          const usernameResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
          );
          if (usernameResponse.ok) {
            const usernameData = await usernameResponse.json();
            instagramUsername = usernameData.username;
          }
          
          console.log("Found Instagram Business Account:", instagramAccountId, instagramUsername);
          break;
        }
      }
    }

    if (!instagramAccountId) {
      throw new Error("No Instagram Business account found linked to your Facebook Pages. Please link your Instagram to a Facebook Page in Meta Business Suite.");
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Encrypt the access token before storing
    const encryptedAccessToken = await encryptToken(pageAccessToken || accessToken);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          user_id: userId,
          platform: "instagram",
          access_token: encryptedAccessToken,
          refresh_token: instagramAccountId, // Store IG account ID in refresh_token field for easy access
          token_expires_at: tokenExpiresAt,
          platform_user_id: instagramAccountId,
          platform_username: instagramUsername,
          scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,platform",
        }
      );

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw new Error(`Failed to save connection: ${upsertError.message}`);
    }

    console.log("Instagram Graph API connection saved successfully for user:", userId);

    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_success=instagram`,
      302
    );
  } catch (err) {
    console.error("Instagram OAuth callback error:", err);
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
      302
    );
  }
});

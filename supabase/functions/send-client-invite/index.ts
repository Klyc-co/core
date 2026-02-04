import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  clientEmail: string;
  clientName: string;
  marketerName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { clientEmail, clientName, marketerName }: InviteRequest = await req.json();

    if (!clientEmail || !clientName) {
      throw new Error("Missing required fields: clientEmail and clientName");
    }

    const inviteUrl = "https://idea-to-idiom.lovable.app/client/auth";

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Klyc <onboarding@resend.dev>",
        to: [clientEmail],
        subject: `${marketerName || "Your marketer"} has invited you to Klyc`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Klyc</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Client Collaboration Portal</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 22px;">You've been invited!</h2>
              <p style="color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                Hi ${clientName},<br><br>
                ${marketerName || "Your marketing team"} has invited you to collaborate on Klyc. You'll be able to:
              </p>
              <ul style="color: #64748b; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
                <li>Review and approve marketing campaigns</li>
                <li>Message your marketing team directly</li>
                <li>Track campaign performance</li>
                <li>Access brand strategy insights</li>
              </ul>
              <p style="color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                <strong style="color: #1a1a2e;">Important:</strong> Please sign up using this email address (<strong>${clientEmail}</strong>) to be connected with your marketer.
              </p>
              <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                Create Your Account
              </a>
              <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Klyc. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Invitation email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-client-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

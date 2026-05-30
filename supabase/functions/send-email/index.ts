import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, user_id, data } = await req.json();

    if (!type || !user_id) {
      return new Response(JSON.stringify({ error: "type and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (userError || !userData?.user?.email) {
      console.log("Could not fetch user email:", userError?.message || "no email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || "User";
    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = `Welcome to HydRent, ${userName}! 🏠`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="color:#2563eb;margin:0;">🏠 HydRent</h1>
              <p style="color:#666;margin:4px 0;">Hyderabad's Broker-Free Rental Platform</p>
            </div>
            <h2 style="color:#333;">Welcome aboard, ${userName}! 🎉</h2>
            <p style="color:#555;line-height:1.6;">
              Thank you for joining HydRent — Hyderabad's trusted platform for finding and listing 
              rental properties without any brokers.
            </p>
            <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0;">
              <h3 style="color:#2563eb;margin-top:0;">Here's what you can do:</h3>
              <ul style="color:#555;padding-left:20px;line-height:1.8;">
                <li>🔍 Search verified properties across Hyderabad</li>
                <li>📍 Explore properties on the interactive map</li>
                <li>💬 Chat directly with property owners</li>
                <li>❤️ Save your favorite listings</li>
                <li>🤖 Use our AI assistant for help</li>
              </ul>
            </div>
            <a href="https://hydrentals.lovable.app/properties" 
               style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Start Exploring Properties
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px;">
              You're receiving this because you signed up on HydRent. No brokers, just genuine listings!
            </p>
          </div>
        `;
        break;

      case "property_approved":
        subject = `Your Property is Now Live on HydRent! 🎉`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#333;">Property Approved! 🎉</h2>
            <p style="color:#555;">
              Great news, ${userName}! Your property "${data?.property_title || 'listing'}" has been 
              approved and is now visible to thousands of tenants on HydRent.
            </p>
            <a href="https://hydrentals.lovable.app/dashboard" 
               style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View Your Dashboard
            </a>
          </div>
        `;
        break;

      case "property_interest":
        subject = `Someone is Interested in Your Property! 💬`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#333;">New Interest! 💬</h2>
            <p style="color:#555;">
              ${data?.interested_user || 'A user'} has shown interest in your property 
              "${data?.property_title || 'listing'}".
            </p>
            <p style="color:#555;">Check your messages to respond!</p>
            <a href="https://hydrentals.lovable.app/messages" 
               style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View Messages
            </a>
          </div>
        `;
        break;

      default:
        subject = `Notification from HydRent`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#333;">${data?.title || 'Notification'}</h2>
            <p style="color:#555;">${data?.message || 'You have a new notification on HydRent.'}</p>
            <a href="https://hydrentals.lovable.app/dashboard" 
               style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Dashboard
            </a>
          </div>
        `;
    }

    // Log the email notification (actual email sending requires an email service like Resend)
    console.log(`Email notification [${type}] prepared for ${email}: ${subject}`);
    console.log("Note: For production email delivery, connect an email service like Resend or SendGrid.");

    // Store a record that the notification was sent
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id,
        title: subject,
        message: `Email notification: ${type}`,
        type: "general",
      });

    return new Response(
      JSON.stringify({ success: true, type, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Email notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
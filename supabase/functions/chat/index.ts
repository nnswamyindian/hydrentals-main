import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`Chat request from user ${userId} at ${new Date().toISOString()}`);

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch live property data from database
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: properties } = await supabase
      .from("properties")
      .select("title, property_type, room_type, rent, deposit, locality, address, furnished_status, amenities, gender_preference, food_available, pets_allowed, available_from")
      .eq("status", "approved")
      .limit(50);

    const propertyList = (properties || []).map((p: any) => 
      `- ${p.title} | ${p.property_type} ${p.room_type || ''} | ₹${p.rent}/mo | ${p.locality} | ${p.furnished_status || 'N/A'} | Amenities: ${(p.amenities || []).join(', ') || 'N/A'} | Gender: ${p.gender_preference || 'Any'} | Food: ${p.food_available ? 'Yes' : 'No'} | Pets: ${p.pets_allowed ? 'Yes' : 'No'} | Available: ${p.available_from || 'Now'}`
    ).join('\n');

    const systemPrompt = `You are HydRent AI Assistant, a helpful property rental chatbot for HydRent — a rental platform for Hyderabad, India.

CURRENT LIVE PROPERTIES ON THE PLATFORM (${(properties || []).length} listings):
${propertyList || 'No properties currently listed.'}

Your role:
- Help users find properties from the ABOVE list. Match their requirements (budget, locality, type, amenities) to available listings.
- Answer questions about Hyderabad localities (HITEC City, Gachibowli, Madhapur, Kondapur, Kukatpally, etc.)
- Explain rental processes, deposits, documentation needed
- Provide tips for tenants and property owners
- If asked about properties NOT in the list, say "I don't see that in our current listings" and suggest browsing the Properties page.

Rules:
- ONLY recommend properties from the above list. Never make up properties.
- Use ₹ for prices, km for distances.
- Be friendly, concise, and helpful.
- If users want to contact an owner or schedule a visit, direct them to the property detail page.`;

    console.log("Chat request with", messages.length, "messages,", (properties || []).length, "properties loaded");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

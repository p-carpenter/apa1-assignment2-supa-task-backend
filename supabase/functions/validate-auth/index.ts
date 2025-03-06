import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Parse cookies from request headers
function parseCookies(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return {};
  
  return cookieHeader.split(';')
    .map(cookie => cookie.trim())
    .reduce((acc, cookie) => {
      const [key, value] = cookie.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
}

// Authentication middleware to validate session
async function validateSession(request: Request) {
  const cookies = parseCookies(request);
  const accessToken = cookies['sb-access-token'];
  const refreshToken = cookies['sb-refresh-token'];
  
  if (!accessToken || !refreshToken) {
    return { user: null, session: null };
  }
  
  // Verify the session
  const { data, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    // Try to refresh the session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    
    if (refreshError) {
      return { user: null, session: null };
    }
    
    return { user: refreshData.user, session: refreshData.session };
  }
  
  return { user: data.user, session: { access_token: accessToken, refresh_token: refreshToken } };
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": url.origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  try {
    // Validate user session
    const { user, session } = await validateSession(req);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers
      });
    }
    
    // Handle GET request to fetch protected data
    if (req.method === "GET") {
      // Fetch user-specific data
      const { data, error } = await supabase
        .from("user_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return new Response(JSON.stringify({ tasks: data }), { headers });
    }
    
    // Handle POST request to create protected data
    if (req.method === "POST") {
      const body = await req.json();
      
      const { task } = body;
      
      if (!task) {
        return new Response(JSON.stringify({ error: "Task is required" }), { 
          status: 400,
          headers
        });
      }
      
      const { data, error } = await supabase
        .from("user_tasks")
        .insert([
          {
            user_id: user.id,
            task,
            completed: false
          }
        ])
        .select();
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ task: data[0] }), { headers });
    }
    
    // Handle unsupported methods
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers 
    });
  }
});
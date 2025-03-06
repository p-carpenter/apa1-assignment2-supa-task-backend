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

// Set cookies in response headers
function setCookies(response: Response, cookies: { name: string, value: string, options?: { [key: string]: string } }[]) {
  cookies.forEach(cookie => {
    let cookieString = `${cookie.name}=${cookie.value}`;

    if (cookie.options) {
      Object.entries(cookie.options).forEach(([key, value]) => {
        cookieString += `; ${key}=${value}`;
      });
    }

    response.headers.append('Set-Cookie', cookieString);
  });

  return response;
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
  const path = url.pathname.split('/').pop();
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": url.origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Sign up endpoint
    if (path === "signup" && req.method === "POST") {
      const { email, password } = await req.json();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ user: data.user, session: data.session }), { headers });
    }

    // Sign in endpoint
    if (path === "signin" && req.method === "POST") {
      const { email, password } = await req.json();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Create response with session data
      let response = new Response(JSON.stringify({ user: data.user, session: data.session }), { headers });

      // Set cookies for the client
      response = setCookies(response, [
        {
          name: 'sb-access-token',
          value: data.session?.access_token || '',
          options: {
            path: '/',
            maxAge: '3600',
            httpOnly: 'true',
            secure: 'true',
            sameSite: 'Lax'
          }
        },
        {
          name: 'sb-refresh-token',
          value: data.session?.refresh_token || '',
          options: {
            path: '/',
            maxAge: '7776000', // 90 days
            httpOnly: 'true',
            secure: 'true',
            sameSite: 'Lax'
          }
        }
      ]);

      return response;
    }

    // Sign out endpoint
    if (path === "signout" && req.method === "POST") {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Create response
      let response = new Response(JSON.stringify({ success: true }), { headers });

      // Clear cookies
      response = setCookies(response, [
        {
          name: 'sb-access-token',
          value: '',
          options: {
            path: '/',
            maxAge: '0',
            httpOnly: 'true',
            secure: 'true',
            sameSite: 'Lax'
          }
        },
        {
          name: 'sb-refresh-token',
          value: '',
          options: {
            path: '/',
            maxAge: '0',
            httpOnly: 'true',
            secure: 'true',
            sameSite: 'Lax'
          }
        }
      ]);

      return response;
    }

    // User endpoint - get current user
    if (path === "user" && req.method === "GET") {
      const { user, session } = await validateSession(req);

      if (!user) {
        return new Response(JSON.stringify({ user: null, session: null }), {
          status: 401,
          headers
        });
      }

      return new Response(JSON.stringify({ user, session }), { headers });
    }

    // Handle unsupported methods or paths
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
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
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    if ((!path || path === "password-recovery") && req.method === "POST") {
      const { email } = await req.json();

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers }
        );
      }

      // Set the redirect URL to the frontend reset password page
      // The token will be automatically appended to this URL by Supabase
      const redirectTo = `http://localhost:3000/reset_password/confirm`;

      // Send the password reset email
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: "Password reset instructions sent" }),
        { headers }
      );
    }

    // Password reset confirmation endpoint - this is called after the user clicks the reset link
    if (path === "confirm" && req.method === "POST") {
      const { email, password, token } = await req.json();

      if (!email || !password || !token) {
        return new Response(
          JSON.stringify({ error: "Email, password, and token are required" }),
          { status: 400, headers }
        );
      }


      try {
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) throw userError;
        
        const user = users.users.find((u: any) => u.email === email);
        
        if (!user) {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers }
          );
        }

        // Update the user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password }
        );

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ message: "Password has been reset successfully" }),
          { headers }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Invalid or expired token";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 401, headers }
        );
      }
    }

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
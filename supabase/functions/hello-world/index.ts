// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// supabase/functions/hello-world/index.ts
Deno.serve(async (req) => {
  const { name } = await req.json();
  
  return new Response(
    JSON.stringify({ message: `Hello ${name}!` }),
    { headers: { "Content-Type": "application/json" } }
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hello-world' \
    --header 'Authorization: Bearer <YOUR_KEY>' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

    curl -i --location --request POST 'https://mpzgyhmcsbinjsokgpff.supabase.co/functions/v1/hello-world' \
    --header 'Authorization: Bearer <YOUR_KEY>' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

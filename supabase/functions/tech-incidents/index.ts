import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Function to process code artifact
function processCodeArtifact(content: string) {
  return {
    type: "code",
    content: content
  };
}

// Function to process image artifact
async function processImageArtifact(fileData: string, fileName: string, fileType: string, displayName: string) {
  try {
    const base64Data = fileData.split(',')[1];
    const fileBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const filename = `${Date.now()}-${fileName || 'artifact.png'}`;
    const { data, error: uploadError } = await supabase.storage
      .from("incident-artifacts")
      .upload(filename, fileBlob, {
        contentType: fileType || 'image/png'
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from("incident-artifacts")
      .getPublicUrl(data.path);

    return {
      type: "image",
      url: urlData.publicUrl,
      alt: `Image for ${displayName}`
    };
  } catch (error) {
    console.error('Error processing file upload:', error);
    throw error;
  }
}

// Function to handle artifact creation or update
async function handleArtifact(body: any, isUpdate = false) {
  let artifactData = null;
  
  if (body.artifactType) {
    if (body.artifactType === "code" && body.artifactContent) {
      artifactData = processCodeArtifact(body.artifactContent);
    } else if (body.artifactType === "image" && body.fileData) {
      const displayName = isUpdate 
        ? (body.update?.name || 'incident')
        : (body.addition?.name || 'incident');
      
      artifactData = await processImageArtifact(
        body.fileData, 
        body.fileName || 'artifact.png', 
        body.fileType || 'image/png',
        displayName
      );
    } else if (body.artifactType === "none") {
      // Explicitly set to null when removing artifact
      artifactData = null;
    }
  }
  
  return artifactData;
}

serve(async (req: Request) => {
  const headers = { "Content-Type": "application/json" };

  try {
    // Handle GET request - fetch incidents
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("tech-incidents")
        .select("*")
        .order("incident_date", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }

    // Handle POST request - add incident
    if (req.method === "POST") {
      const body = await req.json();
      console.log('Edge function received:', body);
      
      // Process artifact data
      const artifactData = await handleArtifact(body);
      
      const incidentData = {
        ...body.addition, ...artifactData
      };
      
      const { error } = await supabase
        .from("tech-incidents")
        .insert([incidentData]);
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      // Return the updated data
      const { data, error: fetchError } = await supabase
        .from("tech-incidents")
        .select("*")
        .order("incident_date", { ascending: true });

      if (fetchError) throw fetchError;
      
      return new Response(JSON.stringify(data), { headers });
    }

    // Handle PUT request - update incident
    if (req.method === "PUT") {
      const body = await req.json();
      console.log('Edge function received:', body);
      
      // Get base update data
      let updateData = { ...body.update };
      
      // Process artifact data for update
      const artifactData = await handleArtifact(body, true);
      
      // Add artifact to update data if it was processed
      if (body.artifactType) {
        updateData.artifact = artifactData;
      }

      const { error } = await supabase
        .from('tech-incidents')
        .update(updateData) 
        .eq('id', body.id)
        .select();
      
      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      const { data, error: fetchError } = await supabase
        .from("tech-incidents")
        .select("*")
        .order("incident_date", { ascending: true });

      if (fetchError) throw fetchError;
      
      return new Response(JSON.stringify(data), { headers });
    }

    // Handle DELETE request - delete incident(s)
    if (req.method === "DELETE") {
      const body = await req.json();
      console.log('Edge function received:', body);

      let query = supabase.from('tech-incidents').delete();

      if (body.ids && Array.isArray(body.ids)) {
        // Bulk delete
        query = query.in('id', body.ids);
      } else if (body.id) {
        // Single delete
        query = query.eq('id', body.id);
      } else {
        return new Response(JSON.stringify({ error: "No valid ID(s) provided" }), {
          status: 400,
          headers,
        });
      }

      const { error } = await query.select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Return updated data
      const { data, error: fetchError } = await supabase
        .from("tech-incidents")
        .select("*")
        .order("incident_date", { ascending: true });

      if (fetchError) throw fetchError;

      return new Response(JSON.stringify(data), { headers });
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

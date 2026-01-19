import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  repositoryId: string;
  question: string;
  geminiApiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { repositoryId, question, geminiApiKey }: ChatRequest = await req.json();

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: repository, error: repoError } = await supabase
      .from("repositories")
      .select("*")
      .eq("id", repositoryId)
      .single();

    if (repoError || !repository) {
      return new Response(
        JSON.stringify({ error: "Repository not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("repository_id", repositoryId)
      .order("created_at", { ascending: true })
      .limit(10);

    const conversationHistory = previousMessages?.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })) || [];

    const systemPrompt = `You are an AI assistant that helps developers understand codebases. You have access to the complete code from the repository "${repository.repo_owner}/${repository.repo_name}".

Here is the codebase content:

${repository.code_content}

Please answer questions about this codebase accurately and helpfully. Reference specific files and line numbers when relevant. Provide code examples when appropriate.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...conversationHistory,
        {
          role: "user",
          parts: [{ text: question }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";

    await supabase.from("chat_messages").insert([
      {
        repository_id: repositoryId,
        role: "user",
        content: question,
      },
      {
        repository_id: repositoryId,
        role: "assistant",
        content: answer,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        answer,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

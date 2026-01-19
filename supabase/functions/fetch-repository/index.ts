import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  download_url?: string;
  url?: string;
}

interface RepositoryRequest {
  repoUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { repoUrl }: RepositoryRequest = await req.json();

    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(urlPattern);

    if (!match) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub repository URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileStructure: Record<string, string> = {};
    let codeContent = "";

    async function fetchDirectory(path = ""): Promise<void> {
      const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const files: GitHubFile[] = await response.json();

      for (const file of files) {
        if (file.type === "file") {
          const ext = file.name.split(".").pop()?.toLowerCase();
          const codeExtensions = [
            "js", "jsx", "ts", "tsx", "py", "java", "cpp", "c", "h",
            "cs", "go", "rs", "php", "rb", "swift", "kt", "scala",
            "html", "css", "scss", "sass", "vue", "svelte", "md",
            "json", "yaml", "yml", "xml", "sql", "sh", "bash"
          ];

          if (ext && codeExtensions.includes(ext) && file.download_url) {
            try {
              const fileResponse = await fetch(file.download_url);
              if (fileResponse.ok) {
                const content = await fileResponse.text();
                fileStructure[file.path] = content;
                codeContent += `\n\n--- FILE: ${file.path} ---\n${content}`;
              }
            } catch (error) {
              console.error(`Error fetching ${file.path}:`, error);
            }
          }
        } else if (file.type === "dir") {
          await fetchDirectory(file.path);
        }
      }
    }

    await fetchDirectory();

    const { data, error } = await supabase
      .from("repositories")
      .insert({
        repo_url: repoUrl,
        repo_name: repoName,
        repo_owner: owner,
        code_content: codeContent,
        file_structure: fileStructure,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        repository: data,
        fileCount: Object.keys(fileStructure).length,
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

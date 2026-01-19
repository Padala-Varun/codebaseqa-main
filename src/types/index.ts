export interface Repository {
  id: string;
  user_id: string | null;
  repo_url: string;
  repo_name: string;
  repo_owner: string;
  code_content: string | null;
  file_structure: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  repository_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

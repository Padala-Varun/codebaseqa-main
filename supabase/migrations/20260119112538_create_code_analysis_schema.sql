/*
  # Code Analysis Platform Schema

  ## Tables Created
  
  ### repositories
  - `id` (uuid, primary key) - Unique identifier for each repository
  - `user_id` (uuid) - User who added the repository (for future auth)
  - `repo_url` (text) - GitHub repository URL
  - `repo_name` (text) - Repository name
  - `repo_owner` (text) - Repository owner
  - `code_content` (text) - Processed code content in LLM-readable format
  - `file_structure` (jsonb) - JSON structure of repository files
  - `created_at` (timestamptz) - When repository was added
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### chat_messages
  - `id` (uuid, primary key) - Unique message identifier
  - `repository_id` (uuid, foreign key) - Associated repository
  - `role` (text) - Message role (user/assistant)
  - `content` (text) - Message content
  - `created_at` (timestamptz) - Message timestamp
  
  ## Security
  - Enable RLS on all tables
  - Public read access for repositories (no auth in initial version)
  - Public read/write access for chat_messages (no auth in initial version)
  
  ## Notes
  - This initial version doesn't require authentication
  - Future versions can add user authentication and ownership
*/

-- Create repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  repo_url text NOT NULL,
  repo_name text NOT NULL,
  repo_owner text NOT NULL,
  code_content text,
  file_structure jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Anyone can view repositories"
  ON repositories FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert repositories"
  ON repositories FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view chat messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_repository_id ON chat_messages(repository_id);
CREATE INDEX IF NOT EXISTS idx_repositories_created_at ON repositories(created_at DESC);
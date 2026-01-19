import { useState, useEffect } from 'react';
import { RepositoryInput } from './components/RepositoryInput';
import { CodeViewer } from './components/CodeViewer';
import { ChatInterface } from './components/ChatInterface';
import { supabase } from './lib/supabase';
import { Repository } from './types';
import { ArrowLeft } from 'lucide-react';

function App() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const handleRepositoryLoaded = async (repositoryId: string, apiKey: string) => {
    setGeminiApiKey(apiKey);

    const { data } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();

    if (data) {
      setRepository(data);
    }
  };

  const handleReset = () => {
    setRepository(null);
    setGeminiApiKey('');
  };

  if (!repository) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <RepositoryInput onRepositoryLoaded={handleRepositoryLoaded} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Analyze another repository
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {repository.repo_owner}/{repository.repo_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {Object.keys(repository.file_structure || {}).length} files analyzed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Repository Code</h2>
            <CodeViewer repository={repository} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ask Questions</h2>
            <ChatInterface
              repositoryId={repository.id}
              geminiApiKey={geminiApiKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

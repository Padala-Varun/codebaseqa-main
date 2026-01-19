import { useState, useEffect } from 'react';
import { FileCode, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { Repository } from '../types';

interface CodeViewerProps {
  repository: Repository;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

export function CodeViewer({ repository }: CodeViewerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (repository.file_structure) {
      const tree = buildFileTree(repository.file_structure);
      setFileTree(tree);

      const firstFile = Object.keys(repository.file_structure)[0];
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    }
  }, [repository]);

  const buildFileTree = (files: Record<string, string>): FileNode[] => {
    const root: FileNode[] = [];
    const dirMap = new Map<string, FileNode>();

    Object.keys(files).sort().forEach((filePath) => {
      const parts = filePath.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = index === parts.length - 1;

        if (isFile) {
          currentLevel.push({
            name: part,
            path: filePath,
            type: 'file',
            content: files[filePath],
          });
        } else {
          let dir = dirMap.get(currentPath);
          if (!dir) {
            dir = {
              name: part,
              path: currentPath,
              type: 'directory',
              children: [],
            };
            dirMap.set(currentPath, dir);
            currentLevel.push(dir);
          }
          currentLevel = dir.children!;
        }
      });
    });

    return root;
  };

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderFileNode = (node: FileNode, level = 0): JSX.Element => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <div
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer ${
              level > 0 ? `ml-${level * 4}` : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={() => toggleDirectory(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-sm font-medium text-gray-700">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderFileNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 28}px` }}
        onClick={() => setSelectedFile(node.path)}
      >
        <FileCode className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">{node.name}</span>
      </div>
    );
  };

  const selectedContent =
    selectedFile && repository.file_structure
      ? repository.file_structure[selectedFile]
      : '';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[600px] flex">
      <div className="w-64 border-r border-gray-200 overflow-y-auto">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Files</h3>
        </div>
        <div className="py-2">
          {fileTree.map((node) => renderFileNode(node))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">{selectedFile || 'No file selected'}</h3>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">
            {selectedContent || 'Select a file to view its contents'}
          </pre>
        </div>
      </div>
    </div>
  );
}

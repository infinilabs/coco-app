import React from 'react';
import { FileText, Image, FileCode, Users, User, Globe } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: 'text' | 'image' | 'code';
  owner: 'personal' | 'team' | 'public';
  description: string;
  date: string;
}

const documents: Document[] = [
  {
    id: '1',
    title: '产品需求规划文档.doc',
    type: 'text',
    owner: 'team',
    description: '2024年Q1产品规划及功能需求文档，包含详细的功能描述和交互设计说明。',
    date: '2024-02-20'
  },
  {
    id: '2',
    title: 'UI设计规范.fig',
    type: 'image',
    owner: 'public',
    description: '最新的设计系统规范文档，包含组件库使用说明和设计标准。',
    date: '2024-02-19'
  },
  {
    id: '3',
    title: 'API接口文档.ts',
    type: 'code',
    owner: 'personal',
    description: 'TypeScript版本的API接口定义文档，包含所有接口的请求和响应类型。',
    date: '2024-02-18'
  },
];

const getIcon = (type: Document['type']) => {
  switch (type) {
    case 'image':
      return <Image className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
    case 'code':
      return <FileCode className="w-5 h-5 text-green-500 dark:text-green-400" />;
    default:
      return <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
  }
};

const getOwnerIcon = (owner: Document['owner']) => {
  switch (owner) {
    case 'team':
      return <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    case 'public':
      return <Globe className="w-4 h-4 text-green-500 dark:text-green-400" />;
    default:
      return <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  }
};

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  selectedId?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({ onSelectDocument, selectedId }) => {
  return (
    <div className="space-y-1 py-2">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelectDocument(doc.id)}
          className={`w-full flex items-start px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
            selectedId === doc.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
          }`}
        >
          <span className="mr-3 mt-0.5">{getIcon(doc.type)}</span>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.title}</span>
              <span className="mt-0.5">{getOwnerIcon(doc.owner)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{doc.description}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">{doc.date}</span>
          </div>
        </button>
      ))}
    </div>
  );
};
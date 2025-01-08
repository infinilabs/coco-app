import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export function ConnectService() {
  const [sourceName, setSourceName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Connecting Google Drive with name:', sourceName);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <button className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Connect Google Drive</span>
        </button>
      </div>

      <div className="mb-8">
        <p className="text-gray-600">
        Coco needs to obtain authorization from your Google Drive account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700 mb-1">
            Data Source Name
          </label>
          <input
            type="text"
            id="sourceName"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your Google Drive"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
import React, { useState } from "react";
import { SearchHeader } from "./SearchHeader";
import { DocumentList } from "./DocumentList";
import { DocumentDetail } from "./DocumentDetail";

export const SearchResults: React.FC = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState("1");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-4 overflow-hidden">
      <div className="flex h-[calc(100vh-100px)]">
        {/* Left Panel */}
        <div className="w-[420px] border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 flex-shrink-0">
            <SearchHeader />
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <DocumentList
              onSelectDocument={setSelectedDocumentId}
              selectedId={selectedDocumentId}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <DocumentDetail documentId={selectedDocumentId} />
        </div>
      </div>
    </div>
  );
};

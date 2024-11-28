import React, { useState } from "react";
import { SearchHeader } from "./SearchHeader";
import { DocumentList } from "./DocumentList";
import { DocumentDetail } from "./DocumentDetail";

export const SearchResults: React.FC = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState("1");

  return (
    <div className="max-h-[458px] w-full p-2 flex flex-col rounded-xl overflow-y-auto overflow-hidden custom-scrollbar focus:outline-none">
      <div className="flex">
        {/* Left Panel */}
        <div className="w-[50%] border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
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

import { useState, useEffect } from "react";

import { DocumentList } from "./DocumentList";
import { DocumentDetail } from "./DocumentDetail";

interface SearchResultsProps {
  input: string;
  isChatMode: boolean;
  queryDocuments: (from: number, size: number, queryStrings: any) => Promise<any>;
}

export function SearchResults({ input, isChatMode, queryDocuments }: SearchResultsProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState("1");

  const [detailData, setDetailData] = useState<any>({});
  const [viewMode, setViewMode] = useState<"detail" | "list">(() => {
    return window.innerWidth < 768 ? "list" : "detail";
  });

  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "list" : "detail");
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function getDocDetail(detail: any) {
    setDetailData(detail);
  }

  return (
    <div className="h-full w-full p-2 pr-0 flex flex-col rounded-xl focus:outline-none">
      <div className="h-full flex">
        {/* Left Panel */}
        <DocumentList
          onSelectDocument={setSelectedDocumentId}
          selectedId={selectedDocumentId}
          input={input}
          getDocDetail={getDocDetail}
          isChatMode={isChatMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          queryDocuments={queryDocuments}
        />

        {/* Right Panel */}
        {viewMode === "detail" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <DocumentDetail document={detailData} />
          </div>
        )}
      </div>
    </div>
  );
}

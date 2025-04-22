import { useState, useEffect } from "react";

import { DocumentList } from "./DocumentList";
import { DocumentDetail } from "./DocumentDetail";
import { useAppStore } from "@/stores/appStore";

interface SearchResultsProps {
  input: string;
  isChatMode: boolean;
}

export function SearchResults({ input, isChatMode }: SearchResultsProps) {
  const isTauri = useAppStore((state) => state.isTauri);

  const [selectedDocumentId, setSelectedDocumentId] = useState("1");

  const [detailData, setDetailData] = useState<any>({});
  const [viewMode, setViewMode] = useState<"detail" | "list">(() => {
    return isTauri ? "detail" : (window.innerWidth < 768 ? "list" : "detail");
  });

  useEffect(() => {
    if (!isTauri) {
      const handleResize = () => {
        setViewMode(window.innerWidth < 768 ? "list" : "detail");
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isTauri]);

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

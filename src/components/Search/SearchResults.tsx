import { useState } from "react";

import { DocumentList } from "./DocumentList";
import { DocumentDetail } from "./DocumentDetail";

interface SearchResultsProps {
  input: string;
  isChatMode: boolean;
}

export function SearchResults({ input, isChatMode }: SearchResultsProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState("1");

  const [detailData, setDetailData] = useState<any>({});

  function getDocDetail(detail: any) {
    setDetailData(detail)
  }

  return (
    <div className="h-[458px] w-full p-2 pr-0 flex flex-col rounded-xl focus:outline-none">
      <div className="h-full flex">
        {/* Left Panel */}
        <DocumentList
          onSelectDocument={setSelectedDocumentId}
          selectedId={selectedDocumentId}
          input={input}
          getDocDetail={getDocDetail}
          isChatMode={isChatMode}
        />

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <DocumentDetail document={detailData} />
        </div>
      </div>
    </div>
  );
}

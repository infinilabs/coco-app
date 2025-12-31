import React from "react";

import ViewExtension from "@/components/Search/ViewExtension";

const ViewExtensionPage: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-background text-foreground overflow-hidden">
      <ViewExtension showFullscreen={false} showDetach={false} showFocus forceResizable />
    </div>
  );
};

export default ViewExtensionPage;

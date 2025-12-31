import React from "react";

import ViewExtension from "@/components/Search/ViewExtension";
import type { ViewExtensionOpened } from "@/stores/extensionStore";

const ViewExtensionPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("ext");
  let initial: ViewExtensionOpened | null = null;
  if (encoded) {
    try {
      const json = decodeURIComponent(atob(encoded));
      initial = JSON.parse(json) as ViewExtensionOpened;
    } catch {}
  }
  return (
    <div className="w-screen h-screen bg-background text-foreground overflow-hidden">
      <ViewExtension
        showFullscreen={false}
        showDetach={false}
        showFocus
        forceResizable
        initialViewExtensionOpened={initial}
      />
    </div>
  );
};

export default ViewExtensionPage;

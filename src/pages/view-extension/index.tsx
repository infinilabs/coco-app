import React, { useMemo } from "react";

import ViewExtension from "@/components/Search/ViewExtension";
import type { ViewExtensionOpened } from "@/stores/extensionStore";

const ViewExtensionPage: React.FC = () => {
  // Parse the 'ext' query parameter from the URL.
  // This parameter contains the base64-encoded JSON data of the extension to be opened.
  // It allows the standalone window to initialize with the correct extension data passed from the main window.
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("ext");
  const manual = params.get("manual") === "1";
  
  const initial = useMemo(() => {
    if (encoded) {
      try {
        const json = decodeURIComponent(atob(encoded));
        return JSON.parse(json) as ViewExtensionOpened;
      } catch (error) {
        console.error("Failed to parse 'ext' query parameter for ViewExtensionPage:", error);
      }
    }
    return null;
  }, [encoded]);

  return (
    <div className="w-screen h-screen bg-background text-foreground overflow-hidden">
      <ViewExtension
        showFullscreen={false}
        showDetach={false}
        showFocus
        forceResizable
        isStandalone={manual}
        // Pass the parsed extension data as the initial state to ensure immediate rendering
        // without relying on the store, which might be empty in this new window.
        initialViewExtensionOpened={initial}
      />
    </div>
  );
};

export default ViewExtensionPage;

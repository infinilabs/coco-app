import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import platformAdapter from "@/utils/platformAdapter";

const getInitialUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || "";
};

const getUrlTitle = (url: string) => {
  try {
    return new URL(url).hostname || "Coco";
  } catch {
    return "Coco";
  }
};

function WebviewPage() {
  const url = useMemo(() => getInitialUrl(), []);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = getUrlTitle(url);
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-sm text-[#666] dark:bg-[#111] dark:text-[#bbb]">
        URL unavailable
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white dark:bg-[#111]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#777] dark:text-[#aaa]">
          Loading...
        </div>
      )}

      <button
        aria-label="Open in browser"
        className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-md bg-black/45 text-white shadow-sm transition hover:bg-black/65"
        onClick={() => {
          platformAdapter.openUrlWithBrowser(url);
        }}
      >
        <ExternalLink className="size-4" />
      </button>

      <iframe
        title={getUrlTitle(url)}
        src={url}
        className="h-full w-full border-0"
        allow="fullscreen; clipboard-read; clipboard-write; geolocation; microphone; camera"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export default WebviewPage;

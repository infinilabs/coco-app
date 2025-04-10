import { useEffect, useCallback } from "react";

import SearchChat from "@/components/SearchChat";
import { useAppStore } from "@/stores/appStore";
import { Get } from "@/api/axiosRequest";
import { useShortcutsStore } from "@/stores/shortcutsStore";

import "@/i18n";
import "@/web.css";

interface WebAppProps {
  headers?: Record<string, unknown>;
  serverUrl?: string;
  width?: number;
  height?: number;
  hasModules?: string[];
  defaultModule?: "search" | "chat";
  hasFeature?: string[];
  hideCoco?: () => void;
  theme?: "auto" | "light" | "dark";
  searchPlaceholder?: string;
  chatPlaceholder?: string;
  showChatHistory?: boolean;
  setIsPinned?: (value: boolean) => void;
}

function WebApp({
  width = 680,
  height = 590,
  headers = {
    "X-API-TOKEN": "cvqt6r02sdb2v3bkgip0x3ixv01f3r2lhnxoz1efbn160wm9og58wtv8t6wrv1ebvnvypuc23dx9pb33aemh",
    "APP-INTEGRATION-ID": "cvkm9hmhpcemufsg3vug",
  },
  // token = "cva1j5ehpcenic3ir7k0h8fb8qtv35iwtywze248oscrej8yoivhb5b1hyovp24xejjk27jy9ddt69ewfi3n",   // https://coco.infini.cloud
  // token = "cvqt6r02sdb2v3bkgip0x3ixv01f3r2lhnxoz1efbn160wm9og58wtv8t6wrv1ebvnvypuc23dx9pb33aemh",  // http://localhost:9000
  // token = "cv5djeb9om602jdvtnmg6kc1muyn2vcadr6te48j9t9pvt59ewrnwj7fwvxrw3va84j2a0lb5y8194fbr3jd",  // http://43.153.113.88:9000
  serverUrl = "http://localhost:9000",
  hideCoco = () => {},
  hasModules = ["search", "chat"],
  defaultModule = "search",
  hasFeature = ['think_active', 'search_active'],
  theme="light",
  searchPlaceholder = "",
  chatPlaceholder = "",
  showChatHistory = true,
  setIsPinned,
}: WebAppProps) {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const setModeSwitch = useShortcutsStore((state) => state.setModeSwitch);

  useEffect(() => {
    setIsTauri(false);
    setEndpoint(serverUrl);
    setModeSwitch("S");
    localStorage.setItem("headers", JSON.stringify(headers||{}));
  }, []);

  const query_coco_fusion = useCallback(async (url: string) => {
    try {
      const [error, response]: any = await Get(url);

      if (error) {
        console.error("_search", error);
        return { hits: [], total: 0 };
      }

      console.log("_suggest", url, response);
      const hits =
        response?.hits?.hits?.map((hit: any) => ({
          document: {
            ...hit._source,
          },
          score: hit._score || 0,
          source: hit._source.source || null,
        })) || [];
      const total = response?.hits?.total?.value || 0;

      console.log("_suggest2", url, total, hits);

      return {
        hits: hits,
        total_hits: total,
      };
    } catch (error) {
      console.error("query_coco_fusion error:", error);
      throw error;
    }
  }, []);

  const querySearch = useCallback(async (input: string) => {
    console.log(input);
    return await query_coco_fusion(`/query/_search?query=${input}`);
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      console.log(from, size, queryStrings);
      try {
        let url = `/query/_search?query=${queryStrings.query}&datasource=${queryStrings.datasource}&from=${from}&size=${size}`;
        if (queryStrings?.rich_categories) {
          url = `/query/_search?query=${queryStrings.query}&rich_category=${queryStrings.rich_category}&from=${from}&size=${size}`;
        }
        return await query_coco_fusion(url);
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

  return (
    <div
      id="searchChat-container"
      className={`coco-container ${theme}`}
      data-theme={theme}
      style={{ maxWidth: `${width}px`, height: `${height}px` }}
    >
      <SearchChat
        isTauri={false}
        hideCoco={hideCoco}
        hasModules={hasModules}
        defaultModule={defaultModule}
        hasFeature={hasFeature}
        theme={theme}
        searchPlaceholder={searchPlaceholder}
        chatPlaceholder={chatPlaceholder}
        querySearch={querySearch}
        queryDocuments={queryDocuments}
        showChatHistory={showChatHistory}
        setIsPinned={setIsPinned}
      />
    </div>
  );
}

export default WebApp;

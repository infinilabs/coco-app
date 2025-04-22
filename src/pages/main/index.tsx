import { useCallback } from "react";

import SearchChat from "@/components/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useFeatureControl } from "@/hooks/useFeatureControl";
import { useConnectStore } from "@/stores/connectStore";

function MainApp() {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  setIsTauri(true);
  const queryTimeout = useConnectStore((state) => {
    return state.queryTimeout;
  });

  const querySearch = useCallback(async (input: string) => {
    try {
      const response: any = await platformAdapter.commands(
        "query_coco_fusion",
        {
          from: 0,
          size: 10,
          queryStrings: { query: input },
          connectionTimeout: queryTimeout,
        }
      );
      if (!response || typeof response !== "object") {
        throw new Error("Invalid response format");
      }
      return response;
    } catch (error) {
      console.error("query_coco_fusion error:", error);
      throw error;
    }
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      try {
        const response: any = await platformAdapter.commands(
          "query_coco_fusion",
          {
            from,
            size,
            queryStrings,
            connectionTimeout: queryTimeout,
          }
        );
        return response;
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

  const hideCoco = useCallback(() => {
    return platformAdapter.hideWindow();
  }, []);

  useSyncStore();

  const hasFeature = useFeatureControl({
    initialFeatures: ["think", "search"],
    featureToToggle: "think",
    condition: (item) => item?._source?.type === "simple",
  });

  return (
    <SearchChat
      isTauri={true}
      querySearch={querySearch}
      queryDocuments={queryDocuments}
      hideCoco={hideCoco}
      hasModules={["search", "chat"]}
      hasFeature={hasFeature}
    />
  );
}

export default MainApp;

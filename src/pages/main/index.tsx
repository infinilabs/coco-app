import { useCallback } from "react";

import SearchChat from "@/pages/web/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import {useAppStore} from "@/stores/appStore";

function MainApp() {

  const setIsTauri = useAppStore((state) => state.setIsTauri);
  setIsTauri(true);

  const querySearch = useCallback(async (input: string) => {
    try {
      const response: any = await platformAdapter.invokeBackend("query_coco_fusion", {
        from: 0,
        size: 10,
        queryStrings: { query: input },
      });
      return response;
    } catch (error) {
      console.error("query_coco_fusion error:", error);
      throw error;
    }
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      try {
        const response: any = await platformAdapter.invokeBackend("query_coco_fusion", {
          from,
          size,
          queryStrings,
        });
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


  return (
    <SearchChat
      isTauri={true}
      querySearch={querySearch}
      queryDocuments={queryDocuments}
      hideCoco={hideCoco}
      hasModules={["search", "chat"]}
    />
  );
}

export default MainApp;

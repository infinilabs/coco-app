import { useCallback } from "react";

import SearchChat from "@/components/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useFeatureControl } from "@/hooks/useFeatureControl";

function MainApp() {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  setIsTauri(true);

  const hideCoco = useCallback(() => {
    return platformAdapter.hideWindow();
  }, []);

  useSyncStore();

  const hasFeature = useFeatureControl({
    initialFeatures: ["think", "search"],
    featureToToggle: "think",
    condition: (item) => item?._source?.type === "simple"
  });

  return (
    <SearchChat
      isTauri={true}
      hideCoco={hideCoco}
      hasModules={["search", "chat"]}
      hasFeature={hasFeature}
    />
  );
}

export default MainApp;

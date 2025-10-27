import { useEffect } from "react";

import { useSearchStore } from "@/stores/searchStore";

export function useKeyboardHandlers() {
  const { setSourceData, setVisibleExtensionStore } = useSearchStore();

  useEffect(() => {
    return () => {
      setSourceData(undefined);
      setVisibleExtensionStore(false);
    };
  }, []);
}

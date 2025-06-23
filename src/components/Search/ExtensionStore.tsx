import { useSearchStore } from "@/stores/searchStore";
import { parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useDebounce } from "ahooks";
import SearchEmpty from "../Common/SearchEmpty";
import { platform } from "@/utils/platform";

const ExtensionStore = () => {
  const { searchValue } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);

  useAsyncEffect(async () => {
    console.log("debouncedSearchValue", debouncedSearchValue);

    if (!debouncedSearchValue.trim()) return;

    const result = await platformAdapter.invokeBackend("search_extension", {
      queryParams: parseSearchQuery({
        query: debouncedSearchValue,
        filters: {
          platform: platform(),
        },
      }),
    });

    console.log("result", result);
  }, [debouncedSearchValue]);

  return (
    <div className="h-full">
      {/* ExtensionStore */}
      <div className="flex justify-center items-center h-full">
        <SearchEmpty />
      </div>
    </div>
  );
};

export default ExtensionStore;

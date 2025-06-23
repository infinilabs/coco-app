import { useSearchStore } from "@/stores/searchStore";
import { parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useDebounce } from "ahooks";

const ExtensionStore = () => {
  const { searchValue } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);

  useAsyncEffect(async () => {
    console.log("debouncedSearchValue", debouncedSearchValue);

    const result = await platformAdapter.invokeBackend("search_extension", {
      queryParams: parseSearchQuery({
        query: debouncedSearchValue,
      }),
    });

    console.log("result", result);
  }, [debouncedSearchValue]);

  return <div>ExtensionStore</div>;
};

export default ExtensionStore;

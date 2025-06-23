import { useSearchStore } from "@/stores/searchStore";
import { parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useDebounce } from "ahooks";
import SearchEmpty from "../Common/SearchEmpty";
import { useState } from "react";

interface SearchExtensionItem {
  action: {
    exec: string;
    args: string[];
  };
  created: string;
  description: string;
  developer: {
    avatar: string;
    bio: string;
    created: string;
    github_handle: string;
    id: string;
    location: string;
    name: string;
    twitter_handle: string;
    updated: string;
    website: string;
  };
  enabled: boolean;
  icon: string;
  id: string;
  name: string;
  platforms: string[];
  type: string;
  updated: string;
  url: {
    code: string;
    download: string;
  };
  version: {
    number: string;
  };
}

const ExtensionStore = () => {
  const { searchValue } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);
  const [list, setList] = useState<SearchExtensionItem[]>([]);

  useAsyncEffect(async () => {
    console.log("debouncedSearchValue", debouncedSearchValue);

    if (!debouncedSearchValue.trim()) {
      return setList([]);
    }

    const result = await platformAdapter.invokeBackend<SearchExtensionItem[]>(
      "search_extension",
      {
        queryParams: parseSearchQuery({
          // query: debouncedSearchValue,
          // filters: {
          //   platform: platform(),
          // },
        }),
      }
    );

    setList(result ?? []);

    console.log("result", result);
  }, [debouncedSearchValue]);

  return (
    <div className="h-full">
      {list.length > 0 ? (
        <div>有结果</div>
      ) : (
        <div className="flex justify-center items-center h-full">
          <SearchEmpty />
        </div>
      )}
    </div>
  );
};

export default ExtensionStore;

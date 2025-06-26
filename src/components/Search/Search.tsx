import { useEffect, memo, useRef } from "react";

import DropdownList from "./DropdownList";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import ContextMenu from "./ContextMenu";
import { NoResults } from "@/components/Common/UI/NoResults";
import Footer from "@/components/Common/UI/Footer";
import AskAi from "./AskAi";
import { useSearch } from "@/hooks/useSearch";
import ExtensionStore from "./ExtensionStore";

const SearchResultsPanel = memo<{
  input: string;
  isChatMode: boolean;
}>(({ input, isChatMode }) => {
  const { sourceData, goAskAi } = useSearchStore();

  const searchState = useSearch();
  const {
    suggests,
    searchData,
    isError,
    isSearchComplete,
    globalItemIndexMap,
    performSearch,
  } = searchState;

  useEffect(() => {
    if (!isChatMode && input) {
      performSearch(input);
    } else if (!input && !sourceData) {
      performSearch("");
    }
  }, [input, isChatMode, performSearch, sourceData]);

  const { setSelectedAssistant, selectedSearchContent, visibleExtensionStore } =
    useSearchStore();

  useEffect(() => {
    if (selectedSearchContent?.type === "AI Assistant") {
      setSelectedAssistant({
        ...selectedSearchContent,
        name: selectedSearchContent.title,
      });
    } else {
      setSelectedAssistant(void 0);
    }
  }, [selectedSearchContent]);

  if (visibleExtensionStore) return <ExtensionStore />;
  if (goAskAi) return <AskAi />;
  if (suggests.length === 0) return <NoResults />;

  return sourceData ? (
    <SearchResults input={input} isChatMode={isChatMode} />
  ) : (
    <DropdownList
      suggests={suggests}
      searchData={searchData}
      globalItemIndexMap={globalItemIndexMap}
      isError={isError}
      isSearchComplete={isSearchComplete}
      isChatMode={isChatMode}
    />
  );
});

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
  setIsPinned?: (value: boolean) => void;
}

function Search({ isChatMode, input, setIsPinned }: SearchProps) {
  const mainWindowRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={mainWindowRef} className={`h-full pb-8 w-full relative`}>
      <SearchResultsPanel input={input} isChatMode={isChatMode} />

      <Footer setIsPinnedWeb={setIsPinned} />

      <ContextMenu />
    </div>
  );
}

export default Search;

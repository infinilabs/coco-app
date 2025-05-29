import { useEffect, memo, useRef } from "react";

import DropdownList from "./DropdownList";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import ContextMenu from "./ContextMenu";
import { NoResults } from "@/components/Common/UI/NoResults";
import Footer from "@/components/Common/UI/Footer";
import AskAi from "./AskAi";
import { useSearch } from "@/hooks/useSearch";

const SearchResultsPanel = memo<{
  input: string;
  isChatMode: boolean;
}>(({ input, isChatMode }) => {
  const { sourceData, goAskAi } = useSearchStore();

  const searchState = useSearch();
  const { performSearch } = searchState;
  const { suggests, searchData, isError, isSearchComplete } = searchState;

  useEffect(() => {
    if (!isChatMode && input) {
      performSearch(input);
    } else if (!input && !sourceData) {
      performSearch("");
    }
  }, [input, isChatMode, performSearch, sourceData]);

  if (goAskAi) return <AskAi />;
  if (suggests.length === 0) return <NoResults />;

  return sourceData ? (
    <SearchResults input={input} isChatMode={isChatMode} />
  ) : (
    <DropdownList
      suggests={suggests}
      searchData={searchData}
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
  hideCoco?: () => void;
  setIsPinned?: (value: boolean) => void;
}

function Search({ isChatMode, input, hideCoco, setIsPinned }: SearchProps) {
  const mainWindowRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={mainWindowRef} className={`h-full pb-8 w-full relative`}>
      <SearchResultsPanel input={input} isChatMode={isChatMode} />

      <Footer setIsPinnedWeb={setIsPinned} />

      <ContextMenu hideCoco={hideCoco} />
    </div>
  );
}

export default Search;

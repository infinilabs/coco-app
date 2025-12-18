import { useEffect, memo, useRef, useCallback, useState } from "react";

import DropdownList from "./DropdownList";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import ContextMenu from "./ContextMenu";
import { NoResults } from "@/components/Common/UI/NoResults";
import Footer from "@/components/Common/UI/Footer";
import AskAi from "./AskAi";
import { useSearch } from "@/hooks/useSearch";
import ExtensionStore from "./ExtensionStore";
import platformAdapter from "@/utils/platformAdapter";
import ViewExtension from "./ViewExtension";
import { visibleFooterBar } from "@/utils";
import clsx from "clsx";

const SearchResultsPanel = memo<{
  input: string;
  isChatMode: boolean;
  changeInput: (val: string) => void;
  changeMode?: (isChatMode: boolean) => void;
  formatUrl?: (item: string) => string;
}>(({ input, isChatMode, changeInput, changeMode, formatUrl }) => {
  const {
    sourceData,
    goAskAi,
    visibleExtensionDetail,
    setSearchValue,
    setVisibleExtensionStore,
  } = useSearchStore();

  const searchState = useSearch();
  const {
    suggests,
    searchData,
    isError,
    isSearchComplete,
    globalItemIndexMap,
    performSearch,
  } = searchState;

  const [extensionId, setExtensionId] = useState<string>();

  useEffect(() => {
    if (!isChatMode && input) {
      performSearch(input);
    } else if (!input && !sourceData) {
      performSearch("");
    }
  }, [input, isChatMode, performSearch, sourceData]);

  const {
    setSelectedAssistant,
    selectedSearchContent,
    visibleExtensionStore,
    viewExtensionOpened,
  } = useSearchStore();

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

  // update state
  const handleOpenExtensionStore = useCallback(() => {
    platformAdapter.showWindow();
    changeMode && changeMode(false);

    if (visibleExtensionStore || visibleExtensionDetail) return;

    changeInput("");
    setSearchValue("");
    setVisibleExtensionStore(true);
  }, [
    changeMode,
    visibleExtensionStore,
    visibleExtensionDetail,
    changeInput,
    setSearchValue,
    setVisibleExtensionStore,
  ]);

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent(
      "open-extension-store",
      handleOpenExtensionStore
    );
    const unlisten_install = platformAdapter.listenEvent(
      "extension_install_success",
      (event) => {
        const { extensionId } = event.payload;

        setExtensionId(extensionId);
      }
    );

    return () => {
      unlisten.then((fn) => {
        fn();
      });
      unlisten_install.then((fn) => {
        fn();
      });
    };
  }, [handleOpenExtensionStore]);

  useEffect(() => {
    if (visibleExtensionDetail) return;

    setExtensionId(void 0);
  }, [visibleExtensionDetail]);

  useEffect(() => {
    if (!extensionId) return;

    handleOpenExtensionStore();
  }, [extensionId]);

  // If state gets updated, render the UI
  if (visibleExtensionStore) {
    return <ExtensionStore extensionId={extensionId} />;
  }

  // Render the view extension
  if (viewExtensionOpened != null) {
    return <ViewExtension />;
  }

  if (goAskAi) return <AskAi isChatMode={isChatMode} />;

  if (sourceData) {
    return <SearchResults input={input} isChatMode={isChatMode} />;
  }

  if (suggests.length === 0) return <NoResults />;

  return (
    <DropdownList
      suggests={suggests}
      searchData={searchData}
      globalItemIndexMap={globalItemIndexMap}
      isError={isError}
      isSearchComplete={isSearchComplete}
      isChatMode={isChatMode}
      formatUrl={formatUrl}
    />
  );
});

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
  setIsPinned?: (value: boolean) => void;
  changeMode?: (isChatMode: boolean) => void;
  formatUrl?: (item: any) => string;
}

function Search({
  changeInput,
  isChatMode,
  input,
  setIsPinned,
  changeMode,
  formatUrl,
}: SearchProps) {
  const mainWindowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={mainWindowRef}
      className={clsx("h-full w-full relative", {
        "pb-8": visibleFooterBar(),
      })}
    >
      <SearchResultsPanel
        input={input}
        isChatMode={isChatMode}
        changeInput={changeInput}
        changeMode={changeMode}
        formatUrl={formatUrl}
      />

      {visibleFooterBar() && <Footer setIsPinnedWeb={setIsPinned} />}

      <ContextMenu formatUrl={formatUrl} />
    </div>
  );
}

export default Search;

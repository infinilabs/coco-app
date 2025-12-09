import { useSearchStore } from "@/stores/searchStore";
import { ChevronLeft, Search } from "lucide-react";

import FontIcon from "@/components/Common/Icons/FontIcon";
import { FC } from "react";
import lightDefaultIcon from "@/assets/images/source_default.png";
import darkDefaultIcon from "@/assets/images/source_default_dark.png";
import { useThemeStore } from "@/stores/themeStore";
import platformAdapter from "@/utils/platformAdapter";
import { navigateBack, visibleSearchBar } from "@/utils";
import VisibleKey from "../Common/VisibleKey";
import clsx from "clsx";

interface MultilevelWrapperProps {
  title?: string;
  icon?: string;
}

const MultilevelWrapper: FC<MultilevelWrapperProps> = (props) => {
  const { icon, title = "" } = props;
  const { isDark } = useThemeStore();

  const renderIcon = () => {
    if (!icon) {
      return <img src={isDark ? darkDefaultIcon : lightDefaultIcon} />;
    }

    if (icon.startsWith("font_")) {
      return <FontIcon name={icon} />;
    }

    return <img src={icon} />;
  };

  return (
    <div
      data-tauri-drag-region
      className={clsx(
        "flex items-center h-10 gap-1 px-2 border border-[#EDEDED] dark:border-[#202126] rounded-l-lg",
        {
          "justify-center": visibleSearchBar(),
          "w-[calc(100vw-16px)] rounded-r-lg": !visibleSearchBar(),
        }
      )}
    >
      <VisibleKey shortcut="backspace" onKeyPress={navigateBack}>
        <ChevronLeft
          className="size-5 text-[#ccc] dark:text-[#d8d8d8] cursor-pointer"
          onClick={navigateBack}
        />
      </VisibleKey>

      <div className="size-5 [&>*]:size-full">{renderIcon()}</div>

      <span className="text-sm whitespace-nowrap">{title}</span>
    </div>
  );
};

interface SearchIconsProps {
  lineCount: number;
  isChatMode: boolean;
  assistant?: any;
}

export default function SearchIcons({
  lineCount,
  isChatMode,
  assistant,
}: SearchIconsProps) {
  const {
    sourceData,
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    selectedExtension,
    viewExtensionOpened,
  } = useSearchStore();

  if (isChatMode) {
    return null;
  }

  const renderContent = () => {
    if (visibleExtensionStore) {
      if (visibleExtensionDetail && selectedExtension) {
        const { name, icon } = selectedExtension;

        return <MultilevelWrapper title={name} icon={icon} />;
      }

      return <MultilevelWrapper title="Extensions Store" icon="font_Store" />;
    }

    if (goAskAi && assistant) {
      const { name, icon } = assistant;

      return <MultilevelWrapper title={name} icon={icon} />;
    }

    if (sourceData) {
      const { source } = sourceData;
      const { name, icon } = source;

      return <MultilevelWrapper title={name} icon={icon} />;
    }

    if (viewExtensionOpened) {
      const name = viewExtensionOpened[0];
      const icon = viewExtensionOpened[1];

      const iconPath = icon ? platformAdapter.convertFileSrc(icon) : void 0;

      return <MultilevelWrapper title={name} icon={iconPath} />;
    }

    return (
      <div className="flex items-center justify-center pl-2 h-10 bg-[#ededed] dark:bg-[#202126]">
        <Search className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8]" />
      </div>
    );
  };

  if (lineCount === 1) {
    return renderContent();
  } else {
    return <div className="w-full flex items-center">{renderContent()}</div>;
  }
}

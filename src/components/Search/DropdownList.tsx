import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Bolt,
  X,
} from "lucide-react";

import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
// import { useTheme } from "@/contexts/ThemeContext";
import { useConnectStore } from "@/stores/connectStore";
import { File } from 'lucide-react';
import { Folder } from 'lucide-react';
import { Box } from 'lucide-react';
import { ArrowBigRight } from 'lucide-react';

type ISearchData = Record<string, any[]>;

interface DropdownListProps {
  selected: (item: any) => void;
  suggests: any[];
  SearchData: ISearchData;
  IsError: boolean;
  isSearchComplete: boolean;
  isChatMode: boolean;
}

function DropdownList({
  selected,
  suggests,
  SearchData,
  IsError,
  isChatMode,
}: DropdownListProps) {
  let globalIndex = 0;
  const globalItemIndexMap: any[] = [];
  // const letterFirstIndex: any = {
  //   a: 0,
  //   s: 0,
  //   d: 0,
  //   f: 0,
  // };

  // const { theme } = useTheme();

  const connector_data = useConnectStore((state) => state.connector_data);
  const datasourceData = useConnectStore((state) => state.datasourceData);

  const endpoint_http = useAppStore((state) => state.endpoint_http);
  const setSourceData = useSearchStore((state) => state.setSourceData);

  const [showError, setShowError] = useState<boolean>(IsError);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    isChatMode && setSelectedItem(null);
  }, [isChatMode]);

  const handleOpenURL = async (url: string) => {
    if (!url) return;
    try {
      if (isTauri()) {
        await open(url);
        // console.log("URL opened in default browser");
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // console.log(
    //   "handleKeyDown",
    //   e.key,
    //   showIndex,
    //   e.key >= "0" && e.key <= "9" && showIndex
    // );
    if (!suggests.length) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedItem((prev) => {
        const res =
          prev === null || prev === 0 ? suggests.length - 1 : prev - 1;

        return res;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null || prev === suggests.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "Meta") {
      e.preventDefault();
      if (selectedItem !== null) {
        const item = globalItemIndexMap[selectedItem];
        setSelectedName(item?.source?.name);
      }
      setShowIndex(true);
    }

    if (e.key === "ArrowRight" && selectedItem !== null) {
      e.preventDefault();
      const item = globalItemIndexMap[selectedItem];
      goToTwoPage(item);
    }

    if (e.key === "Enter" && selectedItem !== null) {
      // console.log("Enter key pressed", selectedItem);
      const item = globalItemIndexMap[selectedItem];
      if (item?.url) {
        handleOpenURL(item?.url);
      } else {
        selected(item);
      }
    }

    if (e.key >= "0" && e.key <= "9" && showIndex) {
      // console.log(`number ${e.key}`);
      const item = globalItemIndexMap[parseInt(e.key, 10)];
      if (item?.url) {
        handleOpenURL(item?.url);
      } else {
        selected(item);
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // console.log("handleKeyUp", e.key);
    if (!suggests.length) return;

    if (!e.metaKey) {
      setShowIndex(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [showIndex, selectedItem, suggests]);

  useEffect(() => {
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      itemRefs.current[selectedItem]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedItem]);

  function findConnectorIcon(item: any) {
    const id = item?.source?.id || "";

    const result_source = datasourceData[endpoint_http]?.find(
      (data: any) => data.id === id
    );

    const connector_id = result_source?.connector?.id;

    const result_connector = connector_data[endpoint_http]?.find(
      (data: any) => data.id === connector_id
    );

    return result_connector;
  }

  function getTypeIcon(
      item: any,
      className: string = "w-5 h-5 flex-shrink-0", // Default className if not provided
      onClick: React.MouseEventHandler<HTMLDivElement> = () => {} // Default no-op function
  ) {
    const connectorSource = findConnectorIcon(item);
    const selectedIcon = connectorSource?.icon;

    // Default behavior when no icon is found
    if (!selectedIcon) {
      console.log("go default folder:");
      return (
          <IconWrapper className={className} onClick={onClick}>
            <ThemedIcon component={Box} className={className} />
          </IconWrapper>
      );
    }

    // Handle remote URLs
    if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={selectedIcon} alt="icon" />
          </IconWrapper>
      );
    } else {
      // Handle local image paths
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={`${endpoint_http}${selectedIcon}`} alt="icon" />
          </IconWrapper>
      );
    }
  }

  const IconWrapper = ({ children,  className, onClick }: { children: React.ReactNode, className: string, onClick: React.MouseEventHandler<HTMLDivElement> }) => (
      <div
          className={className}  // Pass className to the wrapper
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);  // Call passed onClick handler
          }}
      >
        {children}
      </div>
  );

  const ThemedIcon = ({ component: Component, className }: { component: React.ElementType, className: string }) => {
    const [color, setColor] = useState("#000"); // Default to black

    useEffect(() => {
      const updateTheme = () => {
        const isDark = document.body.classList.contains("dark");
        setColor(isDark ? "#DCDCDC" : "#999"); // Adjust colors based on theme
      };

      updateTheme();
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

      return () => observer.disconnect();
    }, []);

    return <Component className={className} color={color} />;
  };

  // function getTypeIcon(item: any) {
  //   const connectorSource = findConnectorIcon(item);
  //   const icons = connectorSource?.icon;
  //
  //   if (!icons) {
  //     return theme === "dark" ? source_default_dark_img : source_default_img;
  //   }
  //
  //   if (icons?.startsWith("http://") || icons?.startsWith("https://")) {
  //     return icons;
  //   } else {
  //     return endpoint_http + icons;
  //   }
  // }

  // function getItemIcon(item: any) {
  //   const connectorSource = findConnectorIcon(item);
  //   const icons = connectorSource?.assets?.icons || {};
  //   const selectedIcon = icons[item?.icon];
  //
  //   if (!selectedIcon) {
  //     return <ThemedIcon component={File} />;
  //   }
  //
  //   if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
  //     return <img className="w-5 h-5 flex-shrink-0" src={selectedIcon} alt="icon" />;
  //   } else {
  //     return <img className="w-5 h-5 flex-shrink-0" src={`${endpoint_http}${selectedIcon}`} alt="icon" />;
  //   }
  // }
  //
  // interface ThemedIconProps {
  //   component: React.ElementType; // This makes it flexible to accept any component like File, FileType2, etc.
  // }
  //
  // const ThemedIcon: React.FC<ThemedIconProps> = ({ component: IconComponent }) => {
  //   const [color, setColor] = useState("#000"); // Default to black
  //
  //   useEffect(() => {
  //     const updateTheme = () => {
  //       const isDark = document.body.classList.contains("dark"); // Check for the "dark" class
  //       setColor(isDark ? "#DCDCDC" : "#999"); // Adjust colors as needed
  //     };
  //
  //     updateTheme();
  //     const observer = new MutationObserver(updateTheme);
  //     observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  //
  //     return () => observer.disconnect();
  //   }, []);
  //
  //   return <IconComponent className="w-5 h-5 flex-shrink-0" color={color} />;
  // };


  // function getIcon(item: any) {
  //   const connectorSource = findConnectorIcon(item);
  //   const icons = connectorSource?.assets?.icons || {};
  //   const selectedIcon = icons[item?.icon];
  //
  //   if (!selectedIcon) {
  //     return <ThemedIcon />;
  //   }
  //
  //   if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
  //     return <img className="w-5 h-5 flex-shrink-0" src={selectedIcon} alt="icon" />;
  //   } else {
  //     return <img className="w-5 h-5 flex-shrink-0" src={`${endpoint_http}${selectedIcon}`} alt="icon" />;
  //   }
  // }
  //
  // const ThemedIcon = () => {
  //   const [color, setColor] = useState("#000"); // Default to black
  //
  //   useEffect(() => {
  //     const updateTheme = () => {
  //       const theme = document.documentElement.getAttribute("data-theme");
  //       setColor(theme === "dark" ? "#fff" : "#000"); // Adjust colors as needed
  //     };
  //
  //     updateTheme();
  //     const observer = new MutationObserver(updateTheme);
  //     observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  //
  //     return () => observer.disconnect();
  //   }, []);
  //
  //   return <File className="w-5 h-5 flex-shrink-0" color={color} />;
  // };


  // function getIcon(item: any) {
  //   const connectorSource = findConnectorIcon(item);
  //   const icons = connectorSource?.assets?.icons || {};
  //
  //   const selectedIcon = icons[item?.icon];
  //
  //   if (!selectedIcon) {
  //     return file_img;
  //   }
  //
  //   if (selectedIcon?.startsWith("http://") || selectedIcon?.startsWith("https://")) {
  //     return selectedIcon;
  //   } else {
  //     return endpoint_http + selectedIcon;
  //   }
  // }

  function getRichIcon(item: any, className: string, onClick: (e: React.MouseEvent) => void) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};

    const selectedIcon = icons[item?.rich_categories?.[0]?.icon];

    if (!selectedIcon) {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <ThemedIcon component={Folder} className={className} />
          </IconWrapper>
      );
    }

    if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={selectedIcon} alt="icon" />
          </IconWrapper>
      );
    } else {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={`${endpoint_http}${selectedIcon}`} alt="icon" />
          </IconWrapper>
      );
    }
  }

  // function getItemIcon(item: any) {
  //   const connectorSource = findConnectorIcon(item);
  //   const icons = connectorSource?.assets?.icons || {};
  //   const selectedIcon = icons[item?.icon];
  //
  //   if (!selectedIcon) {
  //     return <ThemedIcon component={File} />;
  //   }
  //
  //   if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
  //     return <img className="w-5 h-5 flex-shrink-0" src={selectedIcon} alt="icon" />;
  //   } else {
  //     return <img className="w-5 h-5 flex-shrink-0" src={`${endpoint_http}${selectedIcon}`} alt="icon" />;
  //   }
  // }

  function getItemIcon(item: any, className: string = "w-5 h-5 flex-shrink-0", onClick: React.MouseEventHandler<HTMLDivElement> = () => {}) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};
    const selectedIcon = icons[item?.icon];

    if (!selectedIcon) {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <ThemedIcon component={File} className={className} />
          </IconWrapper>
      );
    }

    if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={selectedIcon} alt="icon" />
          </IconWrapper>
      );
    } else {
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={`${endpoint_http}${selectedIcon}`} alt="icon" />
          </IconWrapper>
      );
    }
  }


  function goToTwoPage(item: any) {
    setSourceData(item);
    selected && selected(item);
  }

  // function numberToLetter(num: number): string {
  //   const mapping = ["A", "S", "D", "F"];
  //   if (num >= 0 && num < mapping.length) {
  //     const letter = mapping[num];
  //     letterFirstIndex[letter.toLocaleLowerCase()] = globalIndex
  //     return letter
  //   } else {
  //     return "";
  //   }
  // }

  return (
    <div
      ref={containerRef}
      data-tauri-drag-region
      className="h-[458px] w-full p-2 flex flex-col overflow-y-auto custom-scrollbar focus:outline-none"
      tabIndex={0}
    >
      {showError ? (
        <div className="flex items-center gap-2 text-sm text-[#333] p-2">
          <CircleAlert className="text-[#FF0000] w-[14px] h-[14px]" />
          Coco server is unavailable, only local results and available services
          are displayed.
          <Bolt className="text-[#000] w-[14px] h-[14px] cursor-pointer" />
          <X
            className="text-[#666] w-[16px] h-[16px] cursor-pointer"
            onClick={() => setShowError(false)}
          />
        </div>
      ) : null}
      {Object.entries(SearchData).map(([sourceName, items]) => (
        <div key={sourceName}>
          {Object.entries(SearchData).length < 5 ? (
            <div className="p-2 text-xs text-[#999] dark:text-[#666] flex items-center gap-2.5 relative">
              {getTypeIcon(items[0], "w-4 h-4")}
              {/*<img className="w-4 h-4" src={getTypeIcon(items[0])} alt="icon" />*/}
              {sourceName}
              <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>

              <IconWrapper
                  className="w-4 h-4 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToTwoPage(items[0]);
                  }}
              >
                <ThemedIcon component={ArrowBigRight} className="w-4 h-4" />
              </IconWrapper>

              {/*<SquareArrowRight*/}
              {/*  className="w-4 h-4 cursor-pointer"*/}
              {/*  onClick={() => goToTwoPage(items[0])}*/}
              {/*/>*/}

              {showIndex && sourceName === selectedName ? (
                <div
                  className={`absolute right-2
                      w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
                >
                  →
                </div>
              ) : null}
            </div>
          ) : null}
          {items.map((item: any) => {
            const isSelected = selectedItem === globalIndex;
            const currentIndex = globalIndex;
            globalItemIndexMap.push(item);
            globalIndex++;
            return (
              <div
                key={item._id}
                ref={(el) => (itemRefs.current[currentIndex] = el)}
                onMouseEnter={() => setSelectedItem(currentIndex)}
                onClick={() => {
                  if (item?.url) {
                    handleOpenURL(item?.url);
                  } else {
                    selected(item);
                  }
                }}
                className={`w-full px-2 py-2.5 text-sm flex gap-7 items-center justify-between rounded-lg transition-colors ${
                  isSelected
                    ? "text-white bg-[#950599] hover:bg-[#950599]"
                    : "text-[#333] dark:text-[#d8d8d8]"
                }`}
              >
                <div className="flex gap-2 items-center justify-start max-w-[450px]">
                  {getItemIcon(item)}
                  {/*<img className="w-5 h-5" src={getIcon(item)} alt="icon" />*/}
                  <span
                    className={`text-sm  truncate text-left ${
                      isSelected ? "font-medium" : ""
                    }`}
                  >
                    {item?.title}
                  </span>
                </div>
                <div className="flex-1 text-right min-w-[160px] h-full pl-5 text-[12px] flex gap-2 items-center justify-end relative">
                  {Object.entries(SearchData).length < 5 ? null : (
                      <div
                          className="w-4 h-4 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToTwoPage(item);
                          }}
                      >
                        {getTypeIcon(item, "w-4 h-4 cursor-pointer", (e) => {
                          e.stopPropagation();
                          goToTwoPage(item);
                        })}
                      </div>
                  )}

                  {/*{Object.entries(SearchData).length < 5 ? null : (*/}
                  {/*  <img*/}
                  {/*    className="w-4 h-4 cursor-pointer"*/}
                  {/*    src={getTypeIcon(item)}*/}
                  {/*    alt="icon"*/}
                  {/*    onClick={(e) => {*/}
                  {/*      e.stopPropagation();*/}
                  {/*      goToTwoPage(item);*/}
                  {/*    }}*/}
                  {/*  />*/}
                  {/*)}*/}

                  {item?.rich_categories ? (
                    <div className="flex items-center justify-end max-w-[calc(100%-20px)] whitespace-nowrap">
                      {Object.entries(SearchData).length < 5 ? (
                          <div>
                            {getRichIcon(item, "w-4 h-4 mr-2 cursor-pointer", (e) => {
                              e.stopPropagation();
                              goToTwoPage(item);
                            })}
                          </div>
                      ) : null}
                      <span
                        className={`${
                          isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                        } text-right truncate`}
                      >
                        {item?.rich_categories?.map(
                          (rich_item: any, index: number) => {
                            if (
                              item?.rich_categories.length > 2 &&
                              index ===
                                item?.rich_categories.length - 1
                            )
                              return "";
                            else
                              return (
                                (index !== 0 ? "/" : "") + rich_item?.label
                              );
                          }
                        )}
                      </span>
                      {item?.rich_categories.length > 2 ? (
                        <span
                          className={`${
                            isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                          } text-right truncate`}
                        >
                          {"/" + item?.rich_categories?.at(-1)?.label}
                        </span>
                      ) : null}
                    </div>
                  ) : item?.category || item?.subcategory ? (
                    <span
                      className={`text-[12px] truncate ${
                        isSelected
                          ? "text-[#DCDCDC]"
                          : "text-[#999] dark:text-[#666]"
                      }`}
                    >
                      {(item?.category || "") +
                        (item?.subcategory
                          ? `/${item?.subcategory}`
                          : "")}
                    </span>
                  ) : (
                    <span
                      className={`text-[12px] truncate ${
                        isSelected
                          ? "text-[#DCDCDC]"
                          : "text-[#999] dark:text-[#666]"
                      }`}
                    >
                      {item?.type || ""}
                    </span>
                  )}

                  {isSelected ? (
                    <div
                      className={`absolute ${
                        showIndex && currentIndex < 10 ? "right-7" : "right-0"
                      } w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected
                          ? "shadow-[-6px_0px_6px_2px_#950599]"
                          : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      ↩︎
                    </div>
                  ) : null}

                  {showIndex && currentIndex < 10 ? (
                    <div
                      className={`absolute right-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected
                          ? "shadow-[-6px_0px_6px_2px_#950599]"
                          : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      {currentIndex}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DropdownList;

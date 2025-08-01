import { useContext } from "react";

import { ExtensionsContext } from "../..";
import Applications from "./Applications";
import Application from "./Application";
import { useExtensionsStore } from "@/stores/extensionsStore";
import SharedAi from "./SharedAi";
import AiOverview from "./AiOverview";
import Calculator from "./Calculator";
import FileSearch from "./FileSearch";
import { Ellipsis } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useTranslation } from "react-i18next";

const Details = () => {
  const { rootState } = useContext(ExtensionsContext);
  const quickAiAccessServer = useExtensionsStore((state) => {
    return state.quickAiAccessServer;
  });
  const setQuickAiAccessServer = useExtensionsStore((state) => {
    return state.setQuickAiAccessServer;
  });
  const quickAiAccessAssistant = useExtensionsStore((state) => {
    return state.quickAiAccessAssistant;
  });
  const setQuickAiAccessAssistant = useExtensionsStore((state) => {
    return state.setQuickAiAccessAssistant;
  });
  const addError = useAppStore((state) => {
    return state.addError;
  });
  const { t } = useTranslation();

  const renderContent = () => {
    if (!rootState.activeExtension) return;

    const { id, type, description } = rootState.activeExtension;

    if (id === "Applications") {
      return <Applications />;
    }

    if (type === "application") {
      return <Application />;
    }

    if (id === "QuickAIAccess") {
      return (
        <SharedAi
          key="QuickAIAccess"
          id="QuickAIAccess"
          server={quickAiAccessServer}
          setServer={setQuickAiAccessServer}
          assistant={quickAiAccessAssistant}
          setAssistant={setQuickAiAccessAssistant}
        />
      );
    }

    if (id === "AIOverview") {
      return <AiOverview />;
    }

    if (id === "Calculator") {
      return <Calculator />;
    }

    if (id === "File Search") {
      return <FileSearch />;
    }

    return <div className="text-[#999]">{description}</div>;
  };

  return (
    <div className="flex-1 h-full pr-4 pb-4 overflow-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {rootState.activeExtension?.name}
        </h2>

        {rootState.activeExtension?.developer && (
          <Menu>
            <MenuButton className="h-7">
              <Ellipsis className="size-5 text-[#999]" />
            </MenuButton>

            <MenuItems
              anchor="bottom end"
              className="p-1 text-sm bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700"
            >
              <MenuItem>
                <div
                  className="px-3 py-2 text-nowrap text-red-500 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                  onClick={async () => {
                    try {
                      const { id, developer } = rootState.activeExtension!;

                      await platformAdapter.invokeBackend(
                        "uninstall_extension",
                        {
                          extensionId: id,
                          developer: developer,
                        }
                      );

                      Object.assign(rootState, {
                        activeExtension: void 0,
                        extensions: rootState.extensions.filter((item) => {
                          return item.id !== id;
                        }),
                      });

                      addError(
                        t("settings.extensions.hints.uninstallSuccess"),
                        "info"
                      );
                    } catch (error) {
                      addError(String(error));
                    }
                  }}
                >
                  {t("settings.extensions.hints.uninstall")}
                </div>
              </MenuItem>
            </MenuItems>
          </Menu>
        )}
      </div>

      <div className="text-sm">{renderContent()}</div>
    </div>
  );
};

export default Details;

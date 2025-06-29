import { Button } from "@headlessui/react";
import { useMount } from "ahooks";
import { castArray } from "lodash-es";
import { Folder, SquareArrowOutUpRight, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";

const Applications = () => {
  const { t } = useTranslation();
  const addError = useAppStore((state) => state.addError);
  const [paths, setPaths] = useState<string[]>([]);

  useMount(async () => {
    const paths = await platformAdapter.invokeBackend<string[]>(
      "get_app_search_path"
    );

    setPaths(paths);
  });

  const handleAdd = async () => {
    const selected = await platformAdapter.openFileDialog({
      directory: true,
      multiple: true,
    });

    if (!selected) return;

    const selectedPaths = castArray(selected).filter((selectedPath) => {
      if (paths.includes(selectedPath)) {
        addError(
          t("settings.extensions.application.hits.pathDuplication", {
            replace: [selectedPath],
          })
        );

        return false;
      }

      const isChildPath = paths.some((item) => {
        return selectedPath.startsWith(item);
      });

      if (isChildPath) {
        addError(
          t("settings.extensions.application.hits.pathIncluded", {
            replace: [selectedPath],
          })
        );

        return false;
      }

      return true;
    });

    setPaths((prev) => prev.concat(selectedPaths));

    for await (const path of selectedPaths) {
      await platformAdapter.invokeBackend("add_app_search_path", {
        searchPath: path,
      });
    }
  };

  const handleRemove = (path: string) => {
    setPaths((prev) => prev.filter((item) => item !== path));

    platformAdapter.invokeBackend("remove_app_search_path", {
      searchPath: path,
    });
  };

  const handleReindex = () => {
    platformAdapter.invokeBackend("reindex_applications");
  };

  return (
    <>
      <div className="text-[#999]">
        <p className="font-bold mb-2">
          {t("settings.extensions.application.details.searchScope")}
        </p>

        <p>
          {t("settings.extensions.application.details.searchScopeDescription")}
        </p>
      </div>

      <Button
        className="w-full h-8 my-4 text-[#0087FF] border border-[#EEF0F3] hover:!border-[#0087FF] dark:border-gray-700 rounded-md transition"
        onClick={handleAdd}
      >
        {t("settings.extensions.application.button.addDirectories")}
      </Button>

      <ul className="flex flex-col gap-2 p-0">
        {paths.map((item) => {
          return (
            <li key={item} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-1 overflow-hidden">
                <Folder className="size-4" />

                <span className="flex-1 truncate">{item}</span>
              </div>

              <div className="flex items-center gap-1">
                <SquareArrowOutUpRight
                  className="size-4 cursor-pointer"
                  onClick={() => {
                    platformAdapter.revealItemInDir(item);
                  }}
                />

                <X
                  className="size-4 cursor-pointer"
                  onClick={() => handleRemove(item)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="text-[#999] mt-4">
        <p className="font-bold mb-2">
          {t("settings.extensions.application.details.rebuildIndex")}
        </p>

        <p>
          {t("settings.extensions.application.details.rebuildIndexDescription")}
        </p>
      </div>

      <Button
        className="w-full h-8 my-4 text-[#0087FF] border border-[#EEF0F3] hover:!border-[#0087FF] dark:border-gray-700 rounded-md transition"
        onClick={handleReindex}
      >
        {t("settings.extensions.application.details.reindex")}
      </Button>
    </>
  );
};

export default Applications;

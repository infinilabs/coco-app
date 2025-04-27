import { useApplicationsStore } from "@/stores/applicationsStore";
import platformAdapter from "@/utils/platformAdapter";
import { Button } from "@headlessui/react";
import { castArray, union } from "lodash-es";
import { Folder, SquareArrowOutUpRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const Applications = () => {
  const { t } = useTranslation();
  const searchPaths = useApplicationsStore((state) => state.searchPaths);
  const setSearchPaths = useApplicationsStore((state) => state.setSearchPaths);

  const selectDirectory = async () => {
    const selected = await platformAdapter.openFileDialog({
      directory: true,
      multiple: true,
    });

    if (!selected) return;

    setSearchPaths(union(searchPaths, castArray(selected)));
  };

  return (
    <div className="text-sm">
      <div className="text-[#999]">
        <p className="font-bold mb-2">
          {t("settings.extensions.application.details.searchScope")}
        </p>

        <p>
          {t("settings.extensions.application.details.searchScopeDescription")}
        </p>
      </div>

      <Button
        className="w-full h-8 my-4 text-[#0087FF] border border-[#EEF0F3] hover:border-[#0087FF] dark:border-gray-700 rounded-md transition"
        onClick={selectDirectory}
      >
        {t("settings.extensions.application.button.addDirectories")}
      </Button>

      <ul className="flex flex-col gap-2">
        {searchPaths.map((item) => {
          return (
            <li key={item} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-1 overflow-hidden">
                <Folder className="size-4" />

                <span className="truncate">{item}</span>
              </div>

              <div className="flex items-center gap-1">
                <SquareArrowOutUpRight
                  className="size-4 cursor-pointer"
                  onClick={() => {
                    platformAdapter.openExternal(item);
                  }}
                />

                <X
                  className="size-4 cursor-pointer"
                  onClick={() => {
                    setSearchPaths(searchPaths.filter((path) => path !== item));
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Applications;

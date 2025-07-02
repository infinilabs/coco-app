import { Button } from "@headlessui/react";
import { useMount } from "ahooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import platformAdapter from "@/utils/platformAdapter";
import DirectoryScope from "../DirectoryScope";

const Applications = () => {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<string[]>([]);

  useMount(async () => {
    const paths = await platformAdapter.invokeBackend<string[]>(
      "get_app_search_path"
    );

    setPaths(paths);
  });

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

      <DirectoryScope
        paths={paths}
        buttonPlacement="start"
        className="mt-4"
        onChange={async (_, addedPaths, removedPaths) => {
          if (addedPaths.length > 0) {
            setPaths((prev) => prev.concat(addedPaths));

            for await (const path of addedPaths) {
              await platformAdapter.invokeBackend("add_app_search_path", {
                searchPath: path,
              });
            }
          }

          if (removedPaths.length > 0) {
            for (const path of removedPaths) {
              setPaths((prev) => prev.filter((item) => item !== path));

              platformAdapter.invokeBackend("remove_app_search_path", {
                searchPath: path,
              });
            }
          }
        }}
      />

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

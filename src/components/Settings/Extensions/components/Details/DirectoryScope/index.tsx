import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { Button } from "@headlessui/react";
import clsx from "clsx";
import { castArray } from "lodash-es";
import { Folder, SquareArrowOutUpRight, X } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";

interface DirectoryScopeProps {
  paths: string[];
  buttonPlacement?: "start" | "end";
  className?: string;
  onChange: (
    paths: string[],
    addedPaths: string[],
    removedPaths: string[]
  ) => void;
}

const DirectoryScope: FC<DirectoryScopeProps> = (props) => {
  const { paths, buttonPlacement = "end", className, onChange } = props;
  const { t } = useTranslation();
  const { addError } = useAppStore();

  const handleAdd = async () => {
    const selected = await platformAdapter.openFileDialog({
      directory: true,
      multiple: true,
    });

    if (!selected) return;

    const selectedPaths = castArray(selected).filter((selectedPath) => {
      if (paths.includes(selectedPath)) {
        addError(
          t("settings.extensions.directoryScope.hits.pathDuplication", {
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
          t("settings.extensions.directoryScope.hits.pathIncluded", {
            replace: [selectedPath],
          })
        );

        return false;
      }

      return true;
    });

    const nextPaths = paths.concat(selectedPaths);

    onChange(nextPaths, selectedPaths, []);
  };

  const handleRemove = (path: string) => {
    const nextPaths = paths.filter((item) => item !== path);

    onChange(nextPaths, [], [path]);
  };

  return (
    <div
      className={clsx("flex flex-col gap-4", className, {
        "flex-col-reverse": buttonPlacement === "start",
      })}
    >
      {paths.length > 0 && (
        <div className="flex flex-col gap-2">
          {paths.map((item) => {
            return (
              <div
                key={item}
                className="flex items-center justify-between gap-2"
              >
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
                    onClick={() => {
                      handleRemove(item);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        className="w-full h-8 text-[#0087FF] border border-[#EEF0F3] hover:!border-[#0087FF] dark:border-gray-700 rounded-md transition"
        onClick={handleAdd}
      >
        {t("settings.extensions.directoryScope.button.addDirectories")}
      </Button>
    </div>
  );
};

export default DirectoryScope;

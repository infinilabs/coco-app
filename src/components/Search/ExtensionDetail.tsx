import { useSearchStore } from "@/stores/searchStore";
import { Button } from "@headlessui/react";
import dayjs from "dayjs";
import {
  CircleCheck,
  Download,
  FolderDown,
  GitFork,
  Loader,
  Trash2,
  User,
} from "lucide-react";
import { FC } from "react";

interface ExtensionDetailProps {
  onInstall: () => void;
  onUninstall: () => void;
}

const ExtensionDetail: FC<ExtensionDetailProps> = (props) => {
  const { onInstall, onUninstall } = props;
  const { selectedExtension, installingExtensions } = useSearchStore();

  return (
    selectedExtension && (
      <div className="text-sm text-[#333] dark:text-white">
        <div className="flex justify-between">
          <div className="flex gap-4">
            <img src={selectedExtension.icon} className="size-[56px]" />
            <div className="flex flex-col justify-between">
              <span>{selectedExtension.name}</span>
              <div className="flex items-center gap-6 text-[#999]">
                <div className="flex items-center gap-1">
                  <User className="size-4" />
                  <span>{selectedExtension.developer.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <GitFork className="size-4" />
                  <span>v{selectedExtension.version.number}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FolderDown className="size-4" />
                  <span>{selectedExtension.stats.installs}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2">
            {selectedExtension.installed ? (
              <div className="flex items-center gap-2">
                <Trash2
                  className="size-4 text-red-500 cursor-pointer"
                  onClick={onUninstall}
                />
                <div className="flex items-center gap-1 h-6 px-2 rounded-full text-[#22C461] bg-[#22C461]/20">
                  <CircleCheck className="size-4" />
                  <span>Installed</span>
                </div>
              </div>
            ) : (
              <Button
                className="flex justify-center items-center w-14 h-6 rounded-full bg-[#007BFF] text-white"
                onClick={() => {
                  onInstall();
                }}
              >
                {installingExtensions.includes(selectedExtension.id) ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {(selectedExtension.screenshots?.length ?? 0) > 0 && (
          <div className="flex gap-3 py-4 border-b">
            {selectedExtension.screenshots.map((item) => {
              return (
                <img key={item.url} src={item.url} className="h-[125px]" />
              );
            })}
          </div>
        )}

        <div className="mb-1 mt-4">Description</div>
        <div className="mb-4 text-[#999]">{selectedExtension.description}</div>

        {(selectedExtension.commands?.length ?? 0) > 0 && (
          <>
            <div className="mb-1">Commands</div>

            {selectedExtension.commands?.map((item) => {
              return (
                <div key={item.name}>
                  <div className="mb-1">{item.name}</div>
                  <div className="mb-4 text-[#999]">{item.description}</div>
                </div>
              );
            })}
          </>
        )}

        {(selectedExtension.tags?.length ?? 0) > 0 && (
          <>
            <div className="mb-1">Tags</div>
            <div className="mb-4">
              {selectedExtension.tags?.map((item) => {
                return (
                  <div
                    key={item}
                    className="h-6 px-2 rounded text-[#999] bg-[#E6E6E6] dark:bg-[#333]"
                  >
                    {item}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <span className="mb-1">Last update</span>
        <div className="text-[#999]">
          {dayjs(selectedExtension.updated).format("YYYY-MM-DD HH:mm:ss")}
        </div>
      </div>
    )
  );
};

export default ExtensionDetail;

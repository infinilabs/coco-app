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
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import DeleteDialog from "../Common/DeleteDialog";
import PreviewImage from "../Common/PreviewImage";

interface ExtensionDetailProps {
  onInstall: () => void;
  onUninstall: () => void;
}

const ExtensionDetail: FC<ExtensionDetailProps> = (props) => {
  const { onInstall, onUninstall } = props;
  const { selectedExtension, installingExtensions } = useSearchStore();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleDelete = () => {
    onUninstall();

    setIsOpen(false);
  };

  const renderDivider = () => {
    return <div className="my-4 h-px bg-[#E6E6E6] dark:bg-[#262626]"></div>;
  };

  return (
    selectedExtension && (
      <>
        <div className="text-sm text-[#333] dark:text-white">
          <div className="flex justify-between">
            <div className="flex gap-4">
              <img src={selectedExtension.icon} className="size-[56px]" />
              <div className="flex flex-col justify-around">
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
                    onClick={() => {
                      setIsOpen(true);
                    }}
                  />
                  <div className="flex items-center gap-1 h-6 px-2 rounded-full text-[#22C461] bg-[#22C461]/20">
                    <CircleCheck className="size-4" />
                    <span>{t("extensionDetail.hints.installed")}</span>
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
            <PreviewImage
              urls={selectedExtension.screenshots.map((item) => item.url)}
              classNames={{
                container: "pt-4",
              }}
            />
          )}

          {(selectedExtension.screenshots?.length ?? 0) > 0 && renderDivider()}

          <div className="mb-2 text-[#999]">
            {t("extensionDetail.label.description")}
          </div>
          <p>{selectedExtension.description}</p>

          {renderDivider()}

          {(selectedExtension.commands?.length ?? 0) > 0 && (
            <>
              <div className="mb-2 text-[#999]">
                {t("extensionDetail.label.commands")}
              </div>

              {selectedExtension.commands?.map((item) => {
                return (
                  <div key={item.name}>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={item.icon} className="size-5" />
                      <span>{item.name}</span>
                    </div>
                    <div className="mb-4 text-[#999]">{item.description}</div>
                  </div>
                );
              })}
            </>
          )}

          {(selectedExtension.commands?.length ?? 0) > 0 && renderDivider()}

          {(selectedExtension.tags?.length ?? 0) > 0 && (
            <>
              <div className="mb-2 text-[#999]">
                {t("extensionDetail.label.tags")}
              </div>
              <div className="flex gap-2 mb-4">
                {selectedExtension.tags?.map((item) => {
                  return (
                    <div
                      key={item}
                      className="flex items-center h-6 px-2 rounded text-[#333] bg-[#E6E6E6] dark:text-white dark:bg-[#333]"
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(selectedExtension.tags?.length ?? 0) > 0 && renderDivider()}

          <div className="mb-2 text-[#999]">
            {t("extensionDetail.label.lastUpdate")}
          </div>
          <p>
            {dayjs(selectedExtension.updated).format("YYYY-MM-DD HH:mm:ss")}
          </p>
        </div>

        <DeleteDialog
          reverseButtonPosition
          isOpen={isOpen}
          title={`${t("extensionDetail.deleteDialog.title")} ${selectedExtension.name
            }`}
          description={t("extensionDetail.deleteDialog.description")}
          cancelButtonProps={{
            className:
              "text-white bg-[#007BFF] border-[#007BFF] dark:bg-[#007BFF] dark:border-[#007BFF]",
          }}
          deleteButtonProps={{
            className:
              "!text-[#FF4949] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border-[#E6E6E6] dark:border-white/10",
          }}
          setIsOpen={setIsOpen}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      </>
    )
  );
};

export default ExtensionDetail;

import { useEffect } from "react";
import { filesize } from "filesize";
import { X } from "lucide-react";
import { useAsyncEffect } from "ahooks";

import { useChatStore } from "@/stores/chatStore";
import { isImage } from "@/utils";
import { invoke } from "@tauri-apps/api/core";
import { useConnectStore } from "@/stores/connectStore";
import { useTranslation } from "react-i18next";

interface FileListProps {
  sessionId: string;
  getFileUrl: (path: string) => string;
}

const FileList = (props: FileListProps) => {
  const { sessionId, getFileUrl } = props;
  const { t } = useTranslation();
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);
  const currentService = useConnectStore((state) => state.currentService);

  useEffect(() => {
    return () => {
      setUploadFiles([]);
    };
  }, []);

  useAsyncEffect(async () => {
    const serverId = currentService.id;

    if (uploadFiles.length === 0) return;

    console.log("sessionId", sessionId);
    console.log("serverId", serverId);

    for await (const item of uploadFiles) {
      const { uploaded, path } = item;

      if (uploaded) continue;

      const response = await invoke<{
        acknowledged: boolean;
        attachments: string[];
      }>("upload_attachment", {
        serverId: currentService.id,
        sessionId,
        filePaths: [path],
      });

      console.log("response", response);

      if (response.acknowledged) {
        item.uploaded = true;
        item.attachmentId = response.attachments[0];

        setUploadFiles(uploadFiles);
      }
    }
  }, [uploadFiles]);

  const deleteFile = (id: string) => {
    setUploadFiles(uploadFiles.filter((file) => file.id !== id));
  };

  return (
    <div className="flex flex-wrap gap-y-2 -mx-1 text-sm">
      {uploadFiles.map((file) => {
        const { id, path, icon, name, extname, size, uploaded } = file;

        return (
          <div key={id} className="w-1/3 px-1">
            <div className="relative group flex items-center gap-1 p-1 rounded-[4px] bg-[#dedede] dark:bg-[#202126]">
              <div
                className="absolute flex justify-center items-center size-[14px] bg-red-600 top-0 right-0 rounded-full cursor-pointer translate-x-[5px] -translate-y-[5px] transition opacity-0 group-hover:opacity-100 "
                onClick={() => {
                  deleteFile(id);
                }}
              >
                <X className="size-[10px] text-white" />
              </div>

              <img
                src={getFileUrl(isImage(path) ? path : icon)}
                className="size-[40px]"
              />

              <div className="flex flex-col justify-between overflow-hidden">
                <div className="truncate text-[#333333] dark:text-[#D8D8D8]">
                  {name}
                </div>

                <div className="text-xs text-[#999999]">
                  {uploaded ? (
                    <div className="flex gap-2">
                      {extname && <span>{extname}</span>}
                      <span>
                        {filesize(size, { standard: "jedec", spacer: "" })}
                      </span>
                    </div>
                  ) : (
                    <span>{t("fileList.uploading")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileList;

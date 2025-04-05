import { useEffect, useMemo } from "react";
import { filesize } from "filesize";
import { X } from "lucide-react";
import { useAsyncEffect } from "ahooks";
import { useTranslation } from "react-i18next";

import { useChatStore } from "@/stores/chatStore";
import { useConnectStore } from "@/stores/connectStore";
import FileIcon from "../Common/Icons/FileIcon";
import { delete_attachment, upload_attachment } from "@/commands";

interface FileListProps {
  sessionId: string;
  getFileUrl: (path: string) => string;
}

const FileList = (props: FileListProps) => {
  const { sessionId } = props;
  const { t } = useTranslation();
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);
  const currentService = useConnectStore((state) => state.currentService);

  const serverId = useMemo(() => {
    return currentService.id;
  }, [currentService]);

  useEffect(() => {
    return () => {
      setUploadFiles([]);
    };
  }, []);

  useAsyncEffect(async () => {
    if (uploadFiles.length === 0) return;

    for await (const item of uploadFiles) {
      const { uploaded, path } = item;

      if (uploaded) continue;

      const attachmentIds = await upload_attachment({
        serverId,
        sessionId,
        filePaths: [path],
      });

      if (!attachmentIds) continue;

      Object.assign(item, {
        uploaded: true,
        attachmentId: attachmentIds[0],
      });

      setUploadFiles(uploadFiles);
    }
  }, [uploadFiles]);

  const deleteFile = async (id: string, attachmentId: string) => {
    setUploadFiles(uploadFiles.filter((file) => file.id !== id));

    delete_attachment({ serverId, id: attachmentId });
  };

  return (
    <div className="flex flex-wrap gap-y-2 -mx-1 text-sm">
      {uploadFiles.map((file) => {
        const { id, name, extname, size, uploaded, attachmentId } = file;

        return (
          <div key={id} className="w-1/3 px-1">
            <div className="relative group flex items-center gap-1 p-1 rounded-[4px] bg-[#dedede] dark:bg-[#202126]">
              {attachmentId && (
                <div
                  className="absolute flex justify-center items-center size-[14px] bg-red-600 top-0 right-0 rounded-full cursor-pointer translate-x-[5px] -translate-y-[5px] transition opacity-0 group-hover:opacity-100 "
                  onClick={() => {
                    deleteFile(id, attachmentId);
                  }}
                >
                  <X className="size-[10px] text-white" />
                </div>
              )}

              <FileIcon extname={extname} />

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
                    <span>{t("assistant.fileList.uploading")}</span>
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

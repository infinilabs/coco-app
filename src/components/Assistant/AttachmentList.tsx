import { FC, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useAsyncEffect } from "ahooks";
import { useTranslation } from "react-i18next";

import { useChatStore, UploadAttachments } from "@/stores/chatStore";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import Tooltip2 from "../Common/Tooltip2";
import FileIcon from "../Common/Icons/FileIcon";
import { filesize } from "@/utils";

const AttachmentList = () => {
  const { uploadAttachments, setUploadAttachments } = useChatStore();
  const { currentService } = useConnectStore();

  const serverId = useMemo(() => {
    return currentService.id;
  }, [currentService]);

  useEffect(() => {
    return () => {
      setUploadAttachments([]);
    };
  }, []);

  const uploadAttachment = async (data: UploadAttachments) => {
    const { uploading, uploaded, uploadFailed, path } = data;

    if (uploading || uploaded || uploadFailed) return;

    const { uploadAttachments } = useChatStore.getState();

    const matched = uploadAttachments.find((item) => item.id === data.id);

    if (matched) {
      matched.uploading = true;

      setUploadAttachments(uploadAttachments);
    }

    try {
      const attachmentIds: any = await platformAdapter.commands(
        "upload_attachment",
        {
          serverId,
          filePaths: [path],
        }
      );

      if (!attachmentIds) {
        throw new Error("Failed to get attachment id");
      } else {
        Object.assign(data, {
          uploaded: true,
          attachmentId: attachmentIds[0],
        });
      }
    } catch (error) {
      Object.assign(data, {
        uploadFailed: true,
        failedMessage: String(error),
      });
    } finally {
      Object.assign(data, {
        uploading: false,
      });

      setUploadAttachments(uploadAttachments);
    }
  };

  useAsyncEffect(async () => {
    if (uploadAttachments.length === 0) return;

    for (const item of uploadAttachments) {
      uploadAttachment(item);
    }
  }, [uploadAttachments]);

  const deleteFile = async (id: string) => {
    const { uploadAttachments } = useChatStore.getState();

    const matched = uploadAttachments.find((item) => item.id === id);

    if (!matched) return;

    const { uploadFailed, attachmentId } = matched;

    setUploadAttachments(uploadAttachments.filter((file) => file.id !== id));

    if (uploadFailed) return;

    platformAdapter.commands("delete_attachment", {
      serverId,
      id: attachmentId,
    });
  };

  return (
    <div className="flex flex-wrap gap-y-2 -mx-1 text-sm">
      {uploadAttachments.map((file) => {
        return (
          <AttachmentItem
            key={file.id}
            {...file}
            deletable
            onDelete={deleteFile}
          />
        );
      })}
    </div>
  );
};

interface AttachmentItemProps extends UploadAttachments {
  deletable?: boolean;
  onDelete?: (id: string) => void;
}

export const AttachmentItem: FC<AttachmentItemProps> = (props) => {
  const {
    id,
    name,
    path,
    extname,
    size,
    uploaded,
    attachmentId,
    uploadFailed,
    failedMessage,
    deletable,
    onDelete,
  } = props;
  const { t } = useTranslation();

  return (
    <div key={id} className="w-1/3 px-1">
      <div className="relative group flex items-center gap-1 p-1 rounded-[4px] bg-[#dedede] dark:bg-[#202126]">
        {(uploadFailed || attachmentId) && deletable && (
          <div
            className="absolute flex justify-center items-center size-[14px] bg-red-600 top-0 right-0 rounded-full cursor-pointer translate-x-[5px] -translate-y-[5px] transition opacity-0 group-hover:opacity-100 "
            onClick={() => {
              onDelete?.(id);
            }}
          >
            <X className="size-[10px] text-white" />
          </div>
        )}

        <FileIcon path={path} />

        <div className="flex flex-col justify-between overflow-hidden">
          <div className="truncate text-sm text-[#333333] dark:text-[#D8D8D8]">
            {name}
          </div>

          <div className="text-xs">
            {uploadFailed && failedMessage ? (
              <Tooltip2 content={failedMessage}>
                <span className="text-red-500">Upload Failed</span>
              </Tooltip2>
            ) : (
              <div className="text-[#999]">
                {uploaded ? (
                  <div className="flex gap-2">
                    {extname && <span>{extname}</span>}
                    <span>{filesize(size)}</span>
                  </div>
                ) : (
                  <span>{t("assistant.fileList.uploading")}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachmentList;

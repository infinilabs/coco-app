import {
  AttachmentHit,
  deleteAttachment,
  getAttachment,
} from "@/api/attachment";
import { useConnectStore } from "@/stores/connectStore";
import clsx from "clsx";
import { filesize } from "filesize";
import { Files, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Checkbox from "../Common/Checkbox";

interface SessionFileProps {
  sessionId: string;
}

const SessionFile = (props: SessionFileProps) => {
  const { sessionId } = props;
  const { t } = useTranslation();
  const currentService = useConnectStore((state) => state.currentService);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentHit[]>([]);
  const [visible, setVisible] = useState(false);

  const serverId = useMemo(() => {
    return currentService.id;
  }, [currentService]);

  useEffect(() => {
    getUploadedFiles();
  }, [sessionId]);

  const getUploadedFiles = async () => {
    const response = await getAttachment({ serverId, sessionId });

    setUploadedFiles(response.hits.hits);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAttachment({ serverId, id });

    if (!result) return;

    getUploadedFiles();
  };

  return (
    <div
      className={clsx("select-none", {
        hidden: uploadedFiles.length === 0,
      })}
    >
      <div
        className="absolute top-4 right-4 flex items-center justify-center size-8 rounded-lg bg-[#0072FF] cursor-pointer"
        onClick={() => {
          setVisible(true);
        }}
      >
        <Files className="size-5 text-white" />

        <div className="absolute -top-2 -right-2 flex items-center justify-center min-w-4 h-4 px-1 text-white text-xs rounded-full bg-[#3DB954]">
          {uploadedFiles.length}
        </div>
      </div>

      <div
        className={clsx(
          "absolute inset-0 flex flex-col p-4 bg-white dark:bg-black",
          {
            hidden: !visible,
          }
        )}
      >
        <X
          className="absolute top-4 right-4 size-5 text-[#999] cursor-pointer"
          onClick={() => {
            setVisible(false);
          }}
        />

        <div className="mb-2 text-sm text-[#333] dark:text-[#D8D8D8] font-bold">
          {t("assistant.sessionFile.title")}
        </div>
        <div className="flex items-center justify-between pr-2">
          <span className="text-sm text-[#999]">
            {t("assistant.sessionFile.description")}
          </span>

          <Checkbox indeterminate />
        </div>
        <ul className="flex-1 overflow-auto flex flex-col gap-2 mt-6">
          {uploadedFiles.map((item) => {
            const { id, name, icon, size } = item._source;

            return (
              <li
                key={id}
                className="flex items-center justify-between min-h-12 px-2  rounded-[4px] bg-[#ededed] dark:bg-[#202126]"
              >
                <div className="flex items-center gap-2">
                  <img className="size-8" />

                  <div>
                    <div className="text-sm leading-4 text-[#333] dark:text-[#D8D8D8]">
                      {name}
                    </div>
                    <div className="text-xs text-[#999]">
                      <span>{icon}</span>
                      <span className="pl-2">
                        {filesize(size, { standard: "jedec", spacer: "" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Trash2
                    className="size-4 text-[#999] cursor-pointer"
                    onClick={() => handleDelete(id)}
                  />

                  <Checkbox />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default SessionFile;

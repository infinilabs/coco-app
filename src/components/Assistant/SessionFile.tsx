import clsx from "clsx";
import { filesize } from "filesize";
import { Files, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useConnectStore } from "@/stores/connectStore";
import Checkbox from "@/components/Common/Checkbox";
import { AttachmentHit } from "@/types/commands";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import FileIcon from "../Common/Icons/FileIcon";

interface SessionFileProps {
  sessionId: string;
}

const SessionFile = (props: SessionFileProps) => {
  const { sessionId } = props;
  const { t } = useTranslation();

  const isTauri = useAppStore((state) => state.isTauri);
  const currentService = useConnectStore((state) => state.currentService);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentHit[]>([]);
  const [visible, setVisible] = useState(false);
  const [checkList, setCheckList] = useState<string[]>([]);

  const serverId = useMemo(() => {
    return currentService.id;
  }, [currentService]);

  useEffect(() => {
    setUploadedFiles([]);

    getUploadedFiles();
  }, [sessionId]);

  const getUploadedFiles = async () => {
    if (isTauri) {
      console.log("sessionId", sessionId);

      const response: any = await platformAdapter.commands("get_attachment", {
        serverId,
        sessionId,
      });

      setUploadedFiles(response?.hits?.hits ?? []);
    } else {
    }
  };

  const handleDelete = async (id: string) => {
    let result;
    if (isTauri) {
      result = await platformAdapter.commands("delete_attachment", {
        serverId,
        id,
      });
    } else {
    }
    if (!result) return;

    getUploadedFiles();
  };

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      setCheckList(uploadedFiles?.map((item) => item?._source?.id));
    } else {
      setCheckList([]);
    }
  };

  const handleCheck = (checked: boolean, id: string) => {
    if (checked) {
      setCheckList([...checkList, id]);
    } else {
      setCheckList(checkList.filter((item) => item !== id));
    }
  };

  return (
    <div
      className={clsx("select-none", {
        hidden: uploadedFiles?.length === 0,
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
          {uploadedFiles?.length}
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

          <Checkbox
            indeterminate
            checked={checkList?.length === uploadedFiles?.length}
            onChange={handleCheckAll}
          />
        </div>
        <ul className="flex-1 overflow-auto flex flex-col gap-2 mt-6 p-0">
          {uploadedFiles?.map((item) => {
            const { id, name, icon, size } = item._source;

            return (
              <li
                key={id}
                className="flex items-center justify-between min-h-12 px-2  rounded-[4px] bg-[#ededed] dark:bg-[#202126]"
              >
                <div className="flex items-center gap-1">
                  <FileIcon path={name} />

                  <div>
                    <div className="text-sm leading-4 text-[#333] dark:text-[#D8D8D8]">
                      {name}
                    </div>
                    <div className="text-xs text-[#999]">
                      {icon && <span className="pr-2">{icon}</span>}
                      <span>
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

                  <Checkbox
                    checked={checkList.includes(id)}
                    onChange={(checked) => handleCheck(checked, id)}
                  />
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

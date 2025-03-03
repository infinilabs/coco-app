import { useChatStore } from "@/stores/chatStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAsyncEffect } from "ahooks";
import { isNil } from "lodash-es";
import { size } from "tauri-plugin-fs-pro-api";
import { filesize } from "filesize";
import { X } from "lucide-react";

const FileList = () => {
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);

  useAsyncEffect(async () => {
    for await (const item of uploadFiles) {
      if (isNil(item.size)) {
        item.size = await size(item.path);
      }
    }

    setUploadFiles(uploadFiles);
  }, [uploadFiles]);

  const deleteFile = (id: string) => {
    setUploadFiles(uploadFiles.filter((file) => file.id !== id));
  };

  return (
    <div className="flex flex-wrap text-sm -mx-[2px]">
      {uploadFiles.map((file) => {
        const { id, icon = "", name, extname, size } = file;

        return (
          <div key={id} className="w-1/3 p-1">
            <div className="relative group flex items-center rounded-sm bg-black/10 p-1">
              <div
                className="absolute flex justify-center items-center size-[14px] bg-red-600 top-0 right-0 rounded-full cursor-pointer translate-x-[5px] -translate-y-[5px] transition opacity-0 group-hover:opacity-100 "
                onClick={() => {
                  deleteFile(id);
                }}
              >
                <X className="size-[10px] text-white" />
              </div>

              <img src={convertFileSrc(icon)} className="size-[40px]" />

              <div className="flex-1 flex flex-col justify-between">
                <div className="truncate">{name}</div>

                <div className="text-xs text-black/60">
                  {size ? (
                    <div className="flex gap-2">
                      {extname && <span>{extname}</span>}
                      <span>
                        {filesize(size, { standard: "jedec", spacer: "" })}
                      </span>
                    </div>
                  ) : (
                    <span className="">解析中...</span>
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

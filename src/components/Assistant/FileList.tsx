import { filesize } from "filesize";
import { X } from "lucide-react";

import { useChatStore } from "@/stores/chatStore";
import { isImage } from "@/utils";

interface FileListProps {
  getFileUrl: (path: string) => string;
}

const FileList = ({ getFileUrl }: FileListProps) => {
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);

  const deleteFile = (id: string) => {
    setUploadFiles(uploadFiles.filter((file) => file.id !== id));
  };

  return (
    <div className="flex flex-wrap gap-y-2 -mx-1 text-sm">
      {uploadFiles.map((file) => {
        const { id, path, icon, name, extname, size } = file;

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
                  <div className="flex gap-2">
                    {extname && <span>{extname}</span>}
                    <span>
                      {filesize(size, { standard: "jedec", spacer: "" })}
                    </span>
                  </div>
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

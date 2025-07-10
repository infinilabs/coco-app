import platformAdapter from "@/utils/platformAdapter";
import { FC, useEffect, useState } from "react";
import FontIcon from "./FontIcon";
import { twMerge } from "tailwind-merge";

interface FileIconProps {
  path: string;
  className?: string;
}

const FileIcon: FC<FileIconProps> = (props) => {
  const { path, className } = props;
  const [iconName, setIconName] = useState("");

  useEffect(() => {
    platformAdapter
      .invokeBackend<string>("get_file_icon", { path })
      .then(setIconName);
  });

  return <FontIcon name={iconName} className={twMerge("size-8", className)} />;
};

export default FileIcon;

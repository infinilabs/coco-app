import { FC, useMemo } from "react";
import clsx from "clsx";
import {
  FileExcelFilled,
  FileImageFilled,
  FileMarkdownFilled,
  FilePdfFilled,
  FilePptFilled,
  FileTextFilled,
  FileWordFilled,
  FileZipFilled,
} from "@ant-design/icons";

import AudioIcon from "./AudioIcon";
import VideoIcon from "./VideoIcon";


interface FileIconProps {
  extname: string;
  className?: string;
}

const FileIcon: FC<FileIconProps> = (props) => {
  const { extname, className } = props;

  const presetFileIcons = [
    {
      icon: <FileExcelFilled />,
      color: "#22b35e",
      extnames: ["xlsx", "xls", "csv", "xlsm", "xltx", "xltm", "xlsb"],
    },
    {
      icon: <FileImageFilled />,
      color: "#13c2c2",
      extnames: [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "bmp",
        "webp",
        "svg",
        "ico",
        "tiff",
        "raw",
        "heic",
        "psd",
        "ai",
      ],
    },
    {
      icon: <FileMarkdownFilled />,
      color: "#722ed1",
      extnames: ["md", "mdx", "markdown", "mdown", "mkd", "mkdn"],
    },
    {
      icon: <FilePdfFilled />,
      color: "#ff4d4f",
      extnames: ["pdf", "xps", "oxps"],
    },
    {
      icon: <FilePptFilled />,
      color: "#d04423",
      extnames: [
        "ppt",
        "pptx",
        "pps",
        "ppsx",
        "pot",
        "potx",
        "pptm",
        "potm",
        "ppsm",
      ],
    },
    {
      icon: <FileWordFilled />,
      color: "#1677ff",
      extnames: ["doc", "docx", "dot", "dotx", "docm", "dotm", "rtf", "odt"],
    },
    {
      icon: <FileZipFilled />,
      color: "#fab714",
      extnames: [
        "zip",
        "rar",
        "7z",
        "tar",
        "gz",
        "bz2",
        "xz",
        "tgz",
        "iso",
        "dmg",
      ],
    },
    {
      icon: <VideoIcon />,
      color: "#7b61ff",
      extnames: [
        "mp4",
        "avi",
        "mov",
        "wmv",
        "flv",
        "mkv",
        "webm",
        "m4v",
        "mpeg",
        "mpg",
        "3gp",
        "rmvb",
        "ts",
      ],
    },
    {
      icon: <AudioIcon />,
      color: "#eb2f96",
      extnames: [
        "mp3",
        "wav",
        "flac",
        "ape",
        "aac",
        "ogg",
        "wma",
        "m4a",
        "opus",
        "ac3",
        "mid",
        "midi",
      ],
    },
  ];

  const [icon, iconColor] = useMemo(() => {
    for (const item of presetFileIcons) {
      const { icon, color, extnames } = item;

      if (extnames.includes(extname)) {
        return [icon, color];
      }
    }

    return [<FileTextFilled key="defaultIcon" />, "#8c8c8c"];
  }, [extname]);

  return (
    <div className={clsx("text-3xl", className)} style={{ color: iconColor }}>
      {icon}
    </div>
  );
};

export default FileIcon;

import platformAdapter from "@/utils/platformAdapter";
import { FC, useEffect, useState } from "react";
import FontIcon, { FontIconProps } from "./FontIcon";

const FileIcon: FC<FontIconProps> = (props) => {
  const { name, ...rest } = props;
  const [iconName, setIconName] = useState("");

  useEffect(() => {
    if (name.startsWith("font_")) {
      return setIconName(name);
    }

    platformAdapter
      .invokeBackend<string>("get_file_icon", { path: name })
      .then(setIconName);
  });

  return <FontIcon {...rest} name={iconName} />;
};

export default FileIcon;

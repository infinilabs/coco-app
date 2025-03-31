import React from "react";
import { Box } from "lucide-react";

import IconWrapper from "./IconWrapper";
import ThemedIcon from "./ThemedIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";
import { useAppStore } from "@/stores/appStore";

interface TypeIconProps {
  item: any;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function TypeIcon({
  item,
  className = "w-5 h-5 flex-shrink-0",
  onClick = () => {},
}: TypeIconProps) {
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const connectorSource = useFindConnectorIcon(item);
  // console.log("connectorSource", connectorSource, item);

  if (item?.source?.icon) {
    if (
      item?.source?.icon.startsWith("http://") ||
      item?.source?.icon.startsWith("https://")
    ) {
      return (
        <IconWrapper className={className} onClick={onClick}>
          <img className={className} src={item?.source?.icon} alt="icon" />
        </IconWrapper>
      );
    }
  }

  // If the icon is a valid base64-encoded image
  const isBase64 = connectorSource?.icon?.startsWith("data:image/");
  console.log("isBase64", isBase64);
  if (isBase64) {
    return (
      <IconWrapper className={className} onClick={onClick}>
        <img className={className} src={connectorSource?.icon} alt="icon" />
      </IconWrapper>
    );
  }

  const selectedIcon = connectorSource?.icon;
  console.log("selectedIcon", selectedIcon);

  if (!selectedIcon) {
    // console.log("go default folder:");
    return (
      <IconWrapper className={className} onClick={onClick}>
        <ThemedIcon component={Box} className={className} />
      </IconWrapper>
    );
  }

  if (
    selectedIcon.startsWith("http://") ||
    selectedIcon.startsWith("https://")
  ) {
    return (
      <IconWrapper className={className} onClick={onClick}>
        <img className={className} src={selectedIcon} alt="icon" />
      </IconWrapper>
    );
  }

  return (
    <IconWrapper className={className} onClick={onClick}>
      <img
        className={className}
        src={`${endpoint_http}${selectedIcon}`}
        alt="icon"
      />
    </IconWrapper>
  );
}

export default TypeIcon;

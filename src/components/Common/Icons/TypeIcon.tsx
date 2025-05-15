import React from "react";
import { Box } from "lucide-react";

import IconWrapper from "./IconWrapper";
import ThemedIcon from "./ThemedIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";
import { useAppStore } from "@/stores/appStore";
import FontIcon from "@/components/Common/Icons/FontIcon.tsx";

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

  const isCalculator = item.id === "Calculator";

  if (isCalculator) {
    return (
      <IconWrapper className={className} onClick={onClick}>
        <img className={className} src="/assets/calculator.png" alt="icon" />
      </IconWrapper>
    );
  }

  if (item?.source?.icon) {

    const icon = item?.source?.icon;

    //1. auto get icon, try datasource, then connector
    //2. choose the right component to show icon

    if (
        icon.startsWith("http://") ||
        icon.startsWith("https://")
    ) {
      return (
        <IconWrapper className={className} onClick={onClick}>
          <img className={className} src={icon} alt="icon" />
        </IconWrapper>
      );
    }

    if (icon.startsWith("data:image/")) {
      console.log("isBase64", icon);
      return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={icon} alt="icon" />
          </IconWrapper>
      );
    }

    if (icon.startsWith("font_")) {
      console.log("isFontIcon", icon);
      return <FontIcon name={icon} className={className} />;
    }

  }


  // If the icon is a valid base64-encoded image
  const isBase64 = connectorSource?.icon?.startsWith("data:image/");
  if (isBase64) {
    console.log("isBase64", connectorSource?.icon);
    return (
      <IconWrapper className={className} onClick={onClick}>
        <img className={className} src={connectorSource?.icon} alt="icon" />
      </IconWrapper>
    );
  }

  const selectedIcon = connectorSource?.icon;

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

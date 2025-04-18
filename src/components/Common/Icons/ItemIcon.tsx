import { File } from "lucide-react";
import React, { useState } from "react";
import { useMount } from "ahooks";

import IconWrapper from "./IconWrapper";
import ThemedIcon from "./ThemedIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";
import { useAppStore } from "@/stores/appStore";
import FontIcon from "./FontIcon";
import platformAdapter from "@/utils/platformAdapter";
import { isNil } from "lodash-es";

interface ItemIconProps {
  item: any;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const ItemIcon = React.memo(function ItemIcon({
  item,
  className = "w-5 h-5 flex-shrink-0",
  onClick = () => {},
}: ItemIconProps) {
  const endpoint_http = useAppStore((state) => state.endpoint_http);
  const connectorSource = useFindConnectorIcon(item);
  const icons = connectorSource?.assets?.icons || {};
  const [isAbsolute, setIsAbsolute] = useState<boolean>();

  useMount(async () => {
    if (!item?.icon) {
      return setIsAbsolute(false);
    }

    const { isAbsolute } = await platformAdapter.metadata(item.icon, {
      omitSize: true,
    });

    setIsAbsolute(isAbsolute);
  });

  const renderIcon = () => {
    if (isNil(isAbsolute)) return;

    if (isAbsolute) {
      return (
        <IconWrapper className={className} onClick={onClick}>
          <img
            className={className}
            src={platformAdapter.convertFileSrc(item?.icon)}
            alt="icon"
          />
        </IconWrapper>
      );
    } else {
      if (item?.icon?.startsWith("font_")) {
        return <FontIcon name={item?.icon} className={className} />;
      }

      // If the icon is a valid base64-encoded image
      const isBase64 = item?.icon?.startsWith("data:image/");
      if (isBase64) {
        return (
          <IconWrapper className={className} onClick={onClick}>
            <img className={className} src={item?.icon} alt="icon" />
          </IconWrapper>
        );
      }

      let selectedIcon = icons[item?.icon];
      if (!selectedIcon) {
        selectedIcon = item?.icon;
      }

      if (!selectedIcon) {
        return (
          <IconWrapper className={className} onClick={onClick}>
            <ThemedIcon component={File} className={className} />
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
      } else {
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
    }
  };

  return renderIcon();
});

export default ItemIcon;

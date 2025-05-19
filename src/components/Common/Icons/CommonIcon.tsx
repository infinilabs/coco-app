import { useState } from "react";
import { isEmpty } from "lodash-es";
import { useAsyncEffect } from "ahooks";
import { Box } from "lucide-react";

import platformAdapter from "@/utils/platformAdapter";
import UniversalIcon from "./UniversalIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";

interface CommonIconProps {
  renderOrder: string[];
  item: any;
  itemIcon?: string;
  defaultIcon?: React.FC | string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

function CommonIcon({
  renderOrder,
  itemIcon,
  item,
  defaultIcon,
  className,
  onClick,
}: CommonIconProps) {
  const connectorSource = useFindConnectorIcon(item);

  const [isAbsolute, setIsAbsolute] = useState<boolean>();
  const [defaultIconState, setDefaultIconState] = useState<
    React.FC | string | undefined
  >(defaultIcon);

  useAsyncEffect(async () => {
    if (isEmpty(item)) return;

    try {
      const { isAbsolute } = await platformAdapter.metadata(item.icon, {
        omitSize: true,
      });
      setIsAbsolute(Boolean(isAbsolute));
      setDefaultIconState(defaultIcon || Box);
    } catch (error) {
      setIsAbsolute(false);
    }
  }, [item]);

  // Handle regular icon types
  const renderIconByType = (renderType: string) => {
    switch (renderType) {
      case "special_icon": {
        if (item.id === "Calculator") {
          return (
            <UniversalIcon
              icon="/assets/calculator.png"
              className={className}
              onClick={onClick}
            />
          );
        }

        if (isAbsolute) {
          return (
            <UniversalIcon
              icon={item?.icon}
              appIcon={true}
              className={className}
              onClick={onClick}
            />
          );
        }
        return null;
      }
      case "item_icon":
        return (
          <UniversalIcon
            icon={itemIcon}
            className={className}
            onClick={onClick}
          />
        );
      case "connector_icon": {
        const icons = connectorSource?.assets?.icons || {};
        const selectedIcon = itemIcon && icons[itemIcon] || itemIcon;
        if (!selectedIcon) return null;
        return (
          <UniversalIcon
            icon={selectedIcon}
            className={className}
            onClick={onClick}
          />
        );
      }
      case "default_icon":
        return (
          <UniversalIcon
            defaultIcon={defaultIconState}
            className={className}
            onClick={onClick}
          />
        );
      default:
        return null;
    }
  };

  for (const renderType of renderOrder) {
    const icon = renderIconByType(renderType);
    if (icon) return icon;
    continue;
  }

  return null;
}

export default CommonIcon;

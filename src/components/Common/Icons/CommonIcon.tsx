import { useState } from "react";
import { isEmpty } from "lodash-es";
import { useAsyncEffect } from "ahooks";

import platformAdapter from "@/utils/platformAdapter";
import UniversalIcon from "./UniversalIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";

interface CommonIconProps {
  renderOrder: string[];
  item: any;
  itemIcon?: string;
  defaultIcon?: React.FC;
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

  useAsyncEffect(async () => {
    if (isEmpty(item)) return;

    try {
      const { isAbsolute } = await platformAdapter.metadata(item.icon, {
        omitSize: true,
      });
      setIsAbsolute(Boolean(isAbsolute));
    } catch (error) {
      setIsAbsolute(false);
    }
  }, [item]);

  // Handle special icon types
  const renderSpecialIcon = () => {
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
          icon={platformAdapter.convertFileSrc(item?.icon)}
          className={className}
          onClick={onClick}
        />
      );
    }

    return null;
  };

  // Handle regular icon types
  const renderIconByType = (renderType: string) => {
    switch (renderType) {
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
        const selectedIcon = itemIcon && icons[itemIcon];
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
            defaultIcon={defaultIcon}
            className={className}
            onClick={onClick}
          />
        );
      default:
        return null;
    }
  };

  // Render logic
  const specialIcon = renderSpecialIcon();
  if (specialIcon) return specialIcon;

  for (const renderType of renderOrder) {
    const icon = renderIconByType(renderType);
    if (icon) return icon;
  }

  return null;
}

export default CommonIcon;

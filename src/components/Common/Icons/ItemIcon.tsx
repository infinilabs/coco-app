import { File } from "lucide-react";

import IconWrapper from "./IconWrapper";
import ThemedIcon from "./ThemedIcon";
import { useFindConnectorIcon } from "@/hooks/useFindConnectorIcon";
import { useAppStore } from "@/stores/appStore";

interface ItemIconProps {
  item: any;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function ItemIcon({
  item,
  className = "w-5 h-5 flex-shrink-0",
  onClick = () => {},
}: ItemIconProps) {
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const connectorSource = useFindConnectorIcon(item);
  // console.log("connectorSource", connectorSource);
  const icons = connectorSource?.assets?.icons || {};

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
    selectedIcon=item?.icon
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

export default ItemIcon;

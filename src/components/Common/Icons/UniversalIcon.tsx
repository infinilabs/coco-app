import React from "react";
import { File } from "lucide-react";

import IconWrapper from "./IconWrapper";
import ThemedIcon from "./ThemedIcon";
import FontIcon from "./FontIcon";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";

interface UniversalIconProps {
  icon?: string;                 // Icon source
  defaultIcon?: React.FC;        // Default icon component
  appIcon?: boolean;           // Whether the icon is local
  className?: string;           // Style class name
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  wrapWithIconWrapper?: boolean; // Whether to wrap with IconWrapper
}

type IconType = 'url' | 'base64' | 'font' | 'local' | 'app' | 'splice' | 'default';

function UniversalIcon({
  icon,
  defaultIcon = File,
  appIcon = false,
  className = "w-5 h-5 flex-shrink-0",
  onClick = () => {},
  wrapWithIconWrapper = true,
}: UniversalIconProps) {
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  // Determine icon type
  const getIconType = (icon?: string): IconType => {
    if (!icon) return 'default';
    if (appIcon) return 'app';
    if (icon.startsWith('http://') || icon.startsWith('https://')) return 'url';
    if (icon.startsWith('data:image/')) return 'base64';
    if (icon.startsWith('font_')) return 'font';
    if (icon.startsWith('/assets')) return 'local';
    if (icon.startsWith('/')) return 'splice';
    return 'default';
  };

  // Render image type icon
  const renderImageIcon = (src: string) => {
    const img = <img className={className} src={src} alt="icon" />;
    return wrapWithIconWrapper ? (
      <IconWrapper className={className} onClick={onClick}>
        {img}
      </IconWrapper>
    ) : img;
  };
  
  // Render app type icon
  const renderAppIcon = (src: string) => {
    const img = <img className={className} src={platformAdapter.convertFileSrc(src)} alt="icon" />;
    return wrapWithIconWrapper ? (
      <IconWrapper className={className} onClick={onClick}>
        {img}
      </IconWrapper>
    ) : img;
  };

  // Render default icon
  const renderDefaultIcon = () => {
    const defaultComponent = <ThemedIcon component={defaultIcon} className={className} />;
    return wrapWithIconWrapper ? (
      <IconWrapper className={className} onClick={onClick}>
        {defaultComponent}
      </IconWrapper>
    ) : defaultComponent;
  };

  // Render component based on icon type
  const iconType = getIconType(icon);
  switch (iconType) {
    case 'url':
    case 'base64':
    case 'local':
      return renderImageIcon(icon!);
    case 'app':
      return renderAppIcon(icon!); 
    case 'splice':
      const url = `${endpoint_http}${icon!}`
      return renderImageIcon(url);
    case 'font':
      return <FontIcon name={icon!} className={className} />;
    default:
      return renderDefaultIcon();
  }
}

export default UniversalIcon;
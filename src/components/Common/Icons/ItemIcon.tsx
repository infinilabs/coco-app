import {
    File,
} from "lucide-react";

import IconWrapper from './IconWrapper';
import ThemedIcon from './ThemedIcon';
import { useFindConnectorIcon } from "./hooks"
import { useAppStore } from "@/stores/appStore";

interface ItemIconProps {
    item: any;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function ItemIcon({ 
    item, 
    className = "w-5 h-5 flex-shrink-0", 
    onClick = () => {} 
}: ItemIconProps) {
    const endpoint_http = useAppStore((state) => state.endpoint_http);

    const connectorSource = useFindConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};
    const selectedIcon = icons[item?.icon];

    if (!selectedIcon) {
        return (
            <IconWrapper className={className} onClick={onClick}>
                <ThemedIcon component={File} className={className} />
            </IconWrapper>
        );
    }

    if (selectedIcon.startsWith("http://") || selectedIcon.startsWith("https://")) {
        return (
            <IconWrapper className={className} onClick={onClick}>
                <img className={className} src={selectedIcon} alt="icon" />
            </IconWrapper>
        );
    } else {
        return (
            <IconWrapper className={className} onClick={onClick}>
                <img className={className} src={`${endpoint_http}${selectedIcon}`} alt="icon" />
            </IconWrapper>
        );
    }
}

export default ItemIcon;
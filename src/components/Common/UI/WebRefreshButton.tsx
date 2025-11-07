import { RefreshCw } from "lucide-react";
import { FC, useState } from "react";
import { Button, ButtonProps } from "@headlessui/react";
import clsx from "clsx";

import VisibleKey from "../VisibleKey";
import { useWebConfigStore } from "@/stores/webConfigStore";

const WebRefreshButton: FC<ButtonProps> = (props) => {
  const { className, ...rest } = props;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { onRefresh } = useWebConfigStore();

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      {...rest}
      onClick={handleRefresh}
      className={clsx(
        "flex items-center justify-center size-6 bg-white dark:bg-[#202126] rounded-[8px] border dark:border-white/10",
        className
      )}
      disabled={isRefreshing}
    >
      <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
        <RefreshCw
          className={clsx(
            "size-3 text-[#0287FF] transition-transform duration-1000",
            {
              "animate-spin": isRefreshing,
            }
          )}
        />
      </VisibleKey>
    </Button>
  );
};

export default WebRefreshButton;

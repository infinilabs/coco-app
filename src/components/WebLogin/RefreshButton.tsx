import { RefreshCw } from "lucide-react";
import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

import { useWebConfigStore } from "@/stores/webConfigStore";
import VisibleKey from "../Common/VisibleKey";

const RefreshButton: FC<React.ComponentProps<typeof Button>> = (props) => {
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
      variant="ghost"
      className={clsx(
        "flex items-center justify-center size-6 bg-white dark:bg-[#202126] rounded-[8px] border border-(--border) dark:border-white/10",
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

export default RefreshButton;

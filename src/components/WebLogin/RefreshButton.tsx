import { RefreshCw } from "lucide-react";
import { FC, useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import clsx from "clsx";

import { useWebConfigStore } from "@/stores/webConfigStore";
import VisibleKey from "../Common/VisibleKey";

const RefreshButton: FC<ButtonProps> = (props) => {
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
      variant="outline"
      size="icon"
      className={clsx("size-8", className)}
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

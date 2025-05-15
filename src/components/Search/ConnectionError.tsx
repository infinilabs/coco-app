import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import VisibleKey from "@/components/Common/VisibleKey";

interface ConnectionErrorProps {
  reconnect: () => void;
  connected: boolean;
}

export default function ConnectionError({
  reconnect,
  connected,
}: ConnectionErrorProps) {
  const { t } = useTranslation();

  const [reconnectCountdown, setReconnectCountdown] = useState<number>(0);
  useEffect(() => {
    if (!reconnectCountdown || connected) {
      setReconnectCountdown(0);
      return;
    }

    if (reconnectCountdown > 0) {
      const timer = setTimeout(() => {
        setReconnectCountdown(reconnectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reconnectCountdown, connected]);

  return (
    <div className="absolute top-0 right-0 bottom-0 left-0 px-2 py-4 bg-[rgba(238,238,238,0.98)] dark:bg-[rgba(32,33,38,0.9)] backdrop-blur-[2px] rounded-md font-normal text-xs text-gray-400 flex items-center gap-4 z-10">
      {t("search.input.connectionError")}
      <div
        className="px-1 h-[24px] text-[#0061FF] font-normal text-xs flex items-center justify-center cursor-pointer underline"
        onClick={() => {
          reconnect();
          setReconnectCountdown(10);
        }}
      >
        {reconnectCountdown > 0 ? (
          `${t("search.input.connecting")}(${reconnectCountdown}s)`
        ) : (
          <VisibleKey
            shortcut="R"
            onKeyPress={() => {
              reconnect();
              setReconnectCountdown(10);
            }}
          >
            {t("search.input.reconnect")}
          </VisibleKey>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { CircleAlert, Bolt, X, Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";

import platformAdapter from "@/utils/platformAdapter";
import Tooltip from "@/components/Common/Tooltip";

interface ErrorSearchProps {
  isError: any[];
}

const ErrorSearch = ({
  isError,
}: ErrorSearchProps) => {
  const { t } = useTranslation();

  const [showError, setShowError] = useState<boolean>(isError?.length > 0);

  if (!showError) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-[#333] dark:text-[#666] p-2">
      <CircleAlert className="text-[#FF0000] size-3" />
      {t("search.list.failures")}

      <Tooltip content={isError} position="bottom">
        <Ellipsis className="dark:text-white size-3 cursor-pointer" />
      </Tooltip>

      <Bolt
        className="dark:text-white size-3 cursor-pointer"
        onClick={() => {
          platformAdapter.emitEvent("open_settings", "connect");
        }}
      />
      <X
        className="text-[#666] size-4 cursor-pointer"
        onClick={() => setShowError(false)}
      />
    </div>
  );
};

export default ErrorSearch;

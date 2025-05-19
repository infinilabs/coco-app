import { useState } from "react";
import { CircleAlert, Bolt, X, Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";

import platformAdapter from "@/utils/platformAdapter";

interface ErrorSearchProps {
  isError: any[];
}

const ErrorSearch = ({ isError }: ErrorSearchProps) => {
  const { t } = useTranslation();

  const [showError, setShowError] = useState<boolean>(isError?.length > 0);
  const [showContent, setShowContent] = useState<boolean>(false);

  if (!showError) return null;

  return (
    <div className="text-sm text-[#333] dark:text-[#666] p-2 break-words space-x-2">
      <CircleAlert className="text-[#FF0000] size-3 inline-flex mr-2" />

      {t("search.list.failures")}

      {showContent && (
        <span className="text-[#FF0000] break-all whitespace-pre-wrap">
          {isError?.map((item) => item.error).join(", ")}
        </span>
      )}

      <div
        onClick={() => {
          setShowContent(!showContent);
        }}
        className="inline-flex items-center"
      >
        <Ellipsis className="dark:text-white size-3 cursor-pointer" />
      </div>

      <Bolt
        className="dark:text-white size-3 cursor-pointer inline-flex"
        onClick={() => {
          platformAdapter.emitEvent("open_settings", "connect");
        }}
      />
      <X
        className="text-[#666] size-4 cursor-pointer inline-flex"
        onClick={() => setShowError(false)}
      />
    </div>
  );
};

export default ErrorSearch;

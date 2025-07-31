import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ConnectServiceProps {
  setIsConnect: (isConnect: boolean) => void;
  onAddServer: (endpoint: string) => void;
}

export function Connect({ setIsConnect, onAddServer }: ConnectServiceProps) {
  const { t } = useTranslation();
  const [endpointLink, setEndpointLink] = useState("");
  const [refreshLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const goBack = () => {
    setIsConnect(true);
  };

  const onAddServerClick = async (endpoint: string) => {
    //console.log("onAddServer", endpoint);
    await onAddServer(endpoint);
    setIsConnect(true);
  };

  const onChangeEndpoint = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndpointLink(e.target.value);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-8">
        <button
          className=" text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-[rgba(228,229,239,1)] dark:border-gray-700 p-1"
          onClick={goBack}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-xl text-[#101010] dark:text-white">
          {t("cloud.connect.title")}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-400">
          {t("cloud.connect.description")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="endpoint"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
          >
            {t("cloud.connect.serverAddress")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="endpoint"
              value={endpointLink}
              placeholder={t("cloud.connect.serverPlaceholder")}
              onChange={onChangeEndpoint}
              className="text-[#101010] dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => onAddServerClick(endpointLink)}
            >
              {refreshLoading
                ? t("cloud.connect.connecting")
                : t("cloud.connect.connect")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

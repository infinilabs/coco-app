import { useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import SettingsItem from "./SettingsItem";
import { useAppStore } from "@/stores/appStore";
import { AppEndpoint } from "@/types/index";

const ENDPOINTS = [
  { value: "https://coco.infini.cloud", label: "https://coco.infini.cloud" },
  { value: "http://localhost:9000", label: "http://localhost:9000" },
  { value: "http://infini.tpddns.cn:27200", label: "http://infini.tpddns.cn:27200" },
];

export default function AdvancedSettings() {
  const { t } = useTranslation();
  const endpoint = useAppStore(state => state.endpoint);
  const setEndpoint = useAppStore(state => state.setEndpoint);

  useEffect(() => {}, [endpoint]);

  const onChangeEndpoint = async (newEndpoint: AppEndpoint) => {
    await setEndpoint(newEndpoint);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.advanced.title')}
        </h2>
        <div className="space-y-6">
          <SettingsItem
            icon={Globe}
            title={t('settings.advanced.endpoint.title')}
            description={t('settings.advanced.endpoint.description')}
          >
            <div className={`p-4 rounded-lg`}>
              <select
                value={endpoint}
                onChange={(e) => onChangeEndpoint(e.target.value as AppEndpoint)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white`}
              >
                {ENDPOINTS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </SettingsItem>
        </div>
      </div>
    </div>
  );
}

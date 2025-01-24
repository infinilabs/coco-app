import { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import cocoLogoImg from "@/assets/app-icon.png";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

interface SidebarProps {
  addService: () => void;
}

type StringBooleanMap = {
  [key: string]: boolean;
};

export function Sidebar({ addService }: SidebarProps) {
  const defaultService = useConnectStore((state) => state.defaultService);
  const currentService = useConnectStore((state) => state.currentService);
  const otherServices = useConnectStore((state) => state.otherServices);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const setEndpoint = useAppStore((state) => state.setEndpoint);

  const [defaultHealth, setDefaultHealth] = useState(false);
  const [otherHealth, setOtherHealth] = useState<StringBooleanMap>({});

  const addServiceClick = () => {
    addService();
  };

  useEffect(() => {
    getDefaultHealth();
  }, []);

  useEffect(() => {
    getOtherHealth(currentService);
    setEndpoint(currentService.endpoint);
  }, [currentService.endpoint]);

  const getDefaultHealth = () => {
    let baseURL = defaultService.endpoint
    if (baseURL.endsWith("/")) {
      baseURL = baseURL.slice(0, -1);
    }
    tauriFetch({
      url: `${baseURL}/health`,
      method: "GET",
    })
      .then((res) => {
        // "services": {
        //   "system_cluster": "yellow"
        // },
        // "status": "yellow"
        setDefaultHealth(res.data?.status !== "red");
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const getOtherHealth = (item: any) => {
    if (!item.endpoint) return;
    //
    let baseURL = item.endpoint
    if (baseURL.endsWith("/")) {
      baseURL = baseURL.slice(0, -1);
    }
    tauriFetch({
      url: `${baseURL}/health`,
      method: "GET",
    })
      .then((res) => {
        let obj = {
          ...otherHealth,
          [item.endpoint]: res.data?.status !== "red",
        };
        setOtherHealth(obj);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <div className="w-64 min-h-[550px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="p-4 py-8">
        <div
          className={`flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-6 ${
            currentService.endpoint === defaultService.endpoint
              ? "border border-[rgba(0,135,255,1)]"
              : ""
          }`}
          onClick={() => {
            setCurrentService(defaultService);
            setEndpoint(defaultService.endpoint);
            getDefaultHealth();
          }}
        >
          <img
            src={defaultService.provider.icon || cocoLogoImg}
            alt="cocoLogoImg"
            className="w-5 h-5"
          />

          <span className="font-medium">{defaultService.name}</span>
          <div className="flex-1" />
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            {defaultHealth ? (
              <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
            )}
          </button>
        </div>

        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Third-party services
        </div>

        {otherServices?.map((item, index) => (
          <div
            key={item.name + index}
            className={`flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-2 ${
              currentService.endpoint === item.endpoint
                ? "border border-[rgba(0,135,255,1)]"
                : ""
            }`}
            onClick={() => {
              setEndpoint(item.endpoint);
              setCurrentService(item);
              getOtherHealth(item);
            }}
          >
            <img
              src={item.provider.icon || cocoLogoImg}
              alt="LogoImg"
              className="w-5 h-5"
            />

            <span className="font-medium">{item.name}</span>
            <div className="flex-1" />
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              {otherHealth[item.endpoint] ? (
                <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
              )}
            </button>
          </div>
        ))}

        <div className="space-y-2">
          <button
            className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            onClick={addServiceClick}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

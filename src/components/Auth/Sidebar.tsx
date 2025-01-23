import { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import cocoLogoImg from "@/assets/app-icon.png";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

interface SidebarProps {
  addService: () => void;
}

type NumericBooleanMap = {
  [key: number]: boolean;
};

export function Sidebar({ addService }: SidebarProps) {
  const defaultService = useConnectStore((state) => state.defaultService);
  const currentService = useConnectStore((state) => state.currentService);
  const otherServices = useConnectStore((state) => state.otherServices);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const setEndpoint = useAppStore((state) => state.setEndpoint);

  const [defaultHealth, setDefaultHealth] = useState(false);
  const [otherHealth, setOtherHealth] = useState<NumericBooleanMap>({});

  const addServiceClick = () => {
    addService();
  };

  useEffect(() => {
    getDefaultHealth();
    getOtherHealth();
  }, []);

  const getDefaultHealth = () => {
    tauriFetch({
      url: `${defaultService.endpoint}/health`,
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

  const getOtherHealth = () => {
    otherServices?.map((item, index) => {
      tauriFetch({
        url: `${item.endpoint}/health`,
        method: "GET",
      })
        .then((res) => {
          let obj = {
            ...otherHealth,
            [index]: res.data?.status !== "red",
          };
          setOtherHealth(obj);
        })
        .catch((err) => {
          console.error(err);
        });
    });
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white">
      <div className="p-4 py-8">
        <div
          className={`flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg mb-6 ${
            currentService.name === defaultService.name
              ? "border border-[rgba(0,135,255,1)]"
              : ""
          }`}
          onClick={() => {
            setCurrentService(defaultService);
            setEndpoint(defaultService.endpoint);
          }}
        >
          <img
            src={defaultService.provider.icon || cocoLogoImg}
            alt="cocoLogoImg"
            className="w-5 h-5"
          />

          <span className="font-medium">{defaultService.name}</span>
          <div className="flex-1" />
          <button className="text-blue-600 hover:text-blue-700">
            {defaultHealth ? (
              <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
            )}
          </button>
        </div>

        <div className="text-sm font-medium text-gray-500 mb-2">
          Third-party services
        </div>

        {otherServices?.map((item, index) => (
          <div
            key={item.name + index}
            className={`flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg mb-2 ${
              currentService.name === item.name
                ? "border border-[rgba(0,135,255,1)]"
                : ""
            }`}
            onClick={() => {
              setEndpoint(item.endpoint);
              setCurrentService(item);
            }}
          >
            <img
              src={item.provider.icon || cocoLogoImg}
              alt="LogoImg"
              className="w-5 h-5"
            />

            <span className="font-medium">{item.name}</span>
            <div className="flex-1" />
            <button className="text-blue-600 hover:text-blue-700">
              {otherHealth[index] ? (
                <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
              )}
            </button>
          </div>
        ))}

        <div className="space-y-2">
          <button
            className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300"
            onClick={addServiceClick}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import cocoLogoImg from "@/assets/app-icon.png";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

interface SidebarProps {
  addService: () => void;
  serviceList: any[];
}

export const Sidebar = forwardRef<
  { refreshData: () => void; },
  SidebarProps
>(({ addService, serviceList }, ref) => {
  const currentService = useConnectStore((state) => state.currentService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const setEndpoint = useAppStore((state) => state.setEndpoint);

  const [list, setList] = useState<any[]>([]);
  const [healths, setHealths] = useState<any>({});

  useEffect(() => {
    setList(serviceList)
  }, [serviceList])

  const list_coco_servers = () => {
    invoke("list_coco_servers")
      .then((res: any) => {
        console.log("list_coco_servers", res);
        setList(res);
      })
      .catch((err: any) => {
        console.error(err);
      });
  };
  
  const get_coco_servers_health_info = () => {
    invoke("get_coco_servers_health_info")
      .then((res: any) => {
        console.log("get_coco_servers_health_info", res);
        setHealths(res);
      })
      .catch((err: any) => {
        console.error(err);
      });
  };

  const addServiceClick = () => {
    addService();
  };

  const [isFetching, setIsFetching] = useState(false); // to track if fetching is in progress


  useEffect(() => {
    // Initial data fetch only on mount
    if (!isFetching) {
      setIsFetching(true);
      list_coco_servers();
      get_coco_servers_health_info();
    }
  }, [isFetching]);

  useEffect(() => {
    setEndpoint(currentService.endpoint);
  }, [currentService.endpoint]);

  useImperativeHandle(ref, () => ({
    refreshData: () => {
      if (!isFetching) {
        setIsFetching(true);  // Mark as fetching
        list_coco_servers();
        get_coco_servers_health_info();
      }
    }
  }));

  return (
    <div className="w-64 min-h-[550px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="p-4 py-8">
        <div
          className={`flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-6 ${
            currentService.endpoint === list[0]?.endpoint
              ? "border border-[rgba(0,135,255,1)]"
              : ""
          }`}
          onClick={() => {
            setCurrentService(list[0]);
            setEndpoint(list[0]?.endpoint);
          }}
        >
          <img
            src={list[0]?.provider.icon || cocoLogoImg}
            alt="cocoLogoImg"
            className="w-5 h-5"
          />

          <span className="font-medium">{list[0]?.name}</span>
          <div className="flex-1" />
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            {list[0]?.endpoint && healths[list[0]?.endpoint as keyof typeof healths] ? (
              <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
            )}
          </button>
        </div>

        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Your Coco-Servers
        </div>

        {list?.map((item, index) => (
          <div>
            {index !== 0 ? (
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
                  {healths[item.endpoint as keyof typeof healths] ? (
                    <div className="w-3 h-3 rounded-full bg-[#00DB5E]"></div>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-[#FF4747]"></div>
                  )}
                </button>
              </div>
            ) : null}
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
})

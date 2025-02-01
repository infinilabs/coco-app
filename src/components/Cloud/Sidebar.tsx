import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import cocoLogoImg from "@/assets/app-icon.png";
import { useConnectStore } from "@/stores/connectStore";

interface SidebarProps {
  addService: () => void;
  serviceList: any[];
}

export const Sidebar = forwardRef<{ refreshData: () => void; }, SidebarProps>(
    ({ addService, serviceList }, ref) => {
      const selectedServer = useConnectStore((state) => state.currentService);
      const setSelectedServer = useConnectStore((state) => state.setCurrentService);
      const [list, setList] = useState<any[]>([]);

      useEffect(() => {
        setList(serviceList);
          if (serviceList.length > 0 && serviceList[serviceList.length - 1]?.id) {
              setSelectedServer(serviceList[serviceList.length - 1]);
          } else {
              console.warn("Service list is empty or last item has no id");
          }
      }, [serviceList]);

      const fetchServers = async () => {
        invoke("list_coco_servers")
            .then((res: any) => {
              console.log("list_coco_servers", res);
              setList(res);
                if (serviceList.length > 0 && serviceList[serviceList.length - 1]?.id) {
                    setSelectedServer(serviceList[serviceList.length - 1]);
                } else {
                    console.warn("Service list is empty or last item has no id");
                }
            })
            .catch((err: any) => {
              console.error(err);
            });
      };

      const addServiceClick = () => {
        addService();
      };

      useImperativeHandle(ref, () => ({
        refreshData: fetchServers,
      }));

      useEffect(() => {
        fetchServers();
      }, []);

      // Extracted server item rendering
      const renderServerItem = (item: any) => {
        return (
            <div
                key={item?.id}
                className={`flex cursor-pointer items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-2 ${
                    selectedServer?.id === item?.id ? "dark:bg-blue-900/20 dark:bg-blue-900"  // Apply background color when selected
                        : "bg-gray-50 dark:bg-gray-900" // Default background color when not selected
                }`}
                onClick={() => setSelectedServer(item)}
            >
              <img
                  src={item?.provider?.icon || cocoLogoImg}
                  alt="LogoImg"
                  className="w-5 h-5"
              />
              <span className="font-medium">{item?.name}</span>
              <div className="flex-1" />
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                {item?.available ? (
                    <div className="w-3 h-3 rounded-full bg-[#00DB5E]" />
                ) : (
                    <div className="w-3 h-3 rounded-full bg-[#FF4747]" />
                )}
              </button>
            </div>
        );
      };

      return (
          <div className="w-64 min-h-[550px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="p-4 py-8">
              {/* Render Built-in Servers */}
              <div>
                {list
                    .filter((item) => item?.builtin)
                    .map((item) => renderServerItem(item))}
              </div>

              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Your Coco-Servers
              </div>

              {/* Render Non-Built-in Servers */}
              <div>
                {list
                    .filter((item) => !item?.builtin)
                    .map((item) => renderServerItem(item))}
              </div>

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
);
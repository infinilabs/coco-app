import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

interface ConnectServiceProps {
  setIsConnect: (isConnect: boolean) => void;
}

export function ConnectService({ setIsConnect }: ConnectServiceProps) {
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const setEndpoint = useAppStore((state) => state.setEndpoint);

  const [endpointLink, setEndpointLink] = useState("");
  const [refreshLoading, setRefreshLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Connecting Google Drive with name:", endpointLink);
  };

  const goBack = () => {
    setIsConnect(true);
  };

  const list_coco_servers = () => {
    invoke("list_coco_servers")
      .then((res: any) => {
        console.log("list_coco_servers", res);
        const current = res[res.length-1]
        setCurrentService(current);
        setEndpoint(current?.endpoint);
        setIsConnect(true);
      })
      .catch((err: any) => {
        console.error(err);
      }).finally(() => {
        setRefreshLoading(false);
      });
  };

  const add_coco_server = () => {
    if (!endpointLink) return;
    if (!endpointLink.startsWith("http://") && !endpointLink.startsWith("https://")) {
      return
    }
    setRefreshLoading(true);
    //
    invoke("add_coco_server", {endpoint: endpointLink})
      .then((res: any) => {
        console.log("add_coco_server", res);
        list_coco_servers();
      })
      .catch((err: any) => {
        console.error(err);
      })
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
          Connecting to third-party services
        </div>
      </div>

      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-400">
          Third-party services are provided by other platforms or providers, and
          users can integrate these services into Coco AI to expand the scope of
          search data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="endpoint"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
          >
            Server address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="endpoint"
              value={endpointLink}
              placeholder="For example: https://coco.infini.cloud/"
              onChange={(e) => setEndpointLink(e.target.value)}
              className="text-[#101010] dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => add_coco_server()}
            >
              {refreshLoading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

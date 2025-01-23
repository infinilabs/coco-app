import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";

import { useConnectStore } from "@/stores/connectStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useAppStore } from "@/stores/appStore"

interface ConnectServiceProps {
  setIsConnect: (isConnect: boolean) => void;
}
export function ConnectService({ setIsConnect }: ConnectServiceProps) {
  const addOtherServices = useConnectStore((state) => state.addOtherServices);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const setEndpoint = useAppStore(state => state.setEndpoint);

  const [endpointLink, setEndpointLink] = useState("");
  const [refreshLoading, setRefreshLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Connecting Google Drive with name:", endpointLink);
  };

  const goBack = () => {
    setIsConnect(true);
  };

  const addService = () => {
    if (!endpointLink) return
    setRefreshLoading(true);
    tauriFetch({
      url: `${endpointLink}/provider/_info`,
      method: "GET",
    })
      .then((res) => {
        addOtherServices(res.data)
        setCurrentService(res.data);
        setEndpoint(res.data.endpoint);
        setIsConnect(true);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-8">
        <button
          className=" text-gray-600 hover:text-gray-900 border border-[rgba(228,229,239,1)] p-1"
          onClick={goBack}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-xl text-[#101010]">
          Connecting to third-party services
        </div>
      </div>

      <div className="mb-8">
        <p className="text-gray-600">
          Third-party services are provided by other platforms or providers, and
          users can integrate these services into Coco AI to expand the scope of
          search data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="sourceName"
            className="block text-sm font-medium text-gray-700 mb-2.5"
          >
            Server address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="endpoint"
              value={endpointLink}
              placeholder="For example: https://coco.infini.cloud"
              onChange={(e) => setEndpointLink(e.target.value)}
              className="text-[#101010] flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={addService}
            >
              {refreshLoading ? "Connecting..." : "Connectivity Services"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

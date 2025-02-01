import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import { useConnectStore } from "@/stores/connectStore";

interface ConnectServiceProps {
  setIsConnect: (isConnect: boolean) => void;
  setServiceList: (list: any[]) => void;
}

export function Connect({ setIsConnect, setServiceList }: ConnectServiceProps) {
  const setCurrentService = useConnectStore((state) => state.setCurrentService);
  const [endpointLink, setEndpointLink] = useState("");
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // State to store the error message

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const goBack = () => {
    setIsConnect(true);
  };

  const list_coco_servers = () => {
    invoke("list_coco_servers")
      .then((res: any) => {
        console.log("list_coco_servers", res);
        setServiceList(res)
        const current = res[res.length-1]
        console.log("current:",current);
        setCurrentService(current);
        setIsConnect(true);
      })
      .catch((err: any) => {
        setErrorMessage(err || 'An unknown error occurred.');
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
    invoke("add_coco_server", {endpoint: endpointLink})
      .then((res: any) => {
        console.log("add_coco_server", res);
        list_coco_servers();
      })
      .catch((err: any) => {
        setErrorMessage(err || 'An unknown error occurred.');
        console.error("add coco server:",err);
      }).finally(() => {
        setRefreshLoading(false);
    });
  };

  // Function to close the error message
  const closeError = () => {
    setErrorMessage('');
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
          Connecting to Your Coco-Server
        </div>
      </div>

      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-400">
          Running your own private instance of coco-server ensures complete control over
          your data, keeping it secure and accessible only within your environment.
          Enjoy enhanced privacy, better performance, and seamless integration with your
          internal systems.
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

      {/* Show error message if any */}
      //TODO move to outer container, move error state to global
      {errorMessage && (
          <div
              className="mb-8"
          >
            <div   style={{
              color: 'red',
              marginTop: '10px',
              display: 'block',  // Makes sure the error message starts on a new line
              marginBottom: '10px',
            }}>
              <span>{errorMessage}</span>
              <button
                  onClick={closeError}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'red',
                    cursor: 'pointer'
                  }}
              >
              </button>
            </div>
          </div>
      )}

    </div>
  );
}

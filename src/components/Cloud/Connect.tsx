import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import {useAppStore} from "@/stores/appStore";


interface ConnectServiceProps {
  setIsConnect: (isConnect: boolean) => void;
  onAddServer: (endpoint: string) => void;
}

export function Connect({ setIsConnect,  onAddServer }: ConnectServiceProps) {
  const [endpointLink, setEndpointLink] = useState("");
  const [refreshLoading, ] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // State to store the error message

  const setError = useAppStore((state) => state.setError);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const goBack = () => {
    setIsConnect(true);
  };

  const onAddServerClick = async (endpoint: string) => {
    console.log("onAddServer", endpoint);
    try {
      await onAddServer(endpoint);
      setIsConnect(true); // Only set as connected if the server is added successfully
    } catch (err: any) {
      // Handle the error if something goes wrong
      const errorMessage = typeof err === 'string' ? err : err?.message || 'An unknown error occurred.';
      setErrorMessage("ERR:"+errorMessage);
      setError(errorMessage);
      console.error('Error:', errorMessage);
    }
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
              onClick={()=>onAddServerClick(endpointLink)}
            >
              {refreshLoading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </form>

      {/*//TODO move to outer container, move error state to global*/}
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

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

import { useLogStore } from "@/stores/logStore";

const ApiDetails: React.FC = () => {
  const logs = useLogStore((state) => state.logs);

  const [showAPIDetails, setShowAPIDetails] = useState(false);

  const toggleAPIDetails = useCallback(() => {
    setShowAPIDetails((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "d") {
        const handleKeyG = (e: KeyboardEvent) => {
          if (e.metaKey && e.key === "g") {
            console.log("Command + D + G Detected!");
            toggleAPIDetails();
          }
        };

        window.addEventListener("keydown", handleKeyG, { once: true });
      }
    },
    [toggleAPIDetails]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className={`fixed bottom-0 z-[2000] overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
        showAPIDetails ? "h-[60vh] w-full bg-white shadow-lg rounded-t-lg" : ""
      }`}
    >
      {showAPIDetails && (
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 cursor-pointer flex justify-between" onClick={toggleAPIDetails}>
            API Logs (Latest 10)
            <X />
          </h3>
          <div className="space-y-4 mt-4 ">
            {logs.map((log, index) => (
              <div
                key={index}
                className="p-4 border rounded-md shadow-sm bg-gray-50"
              >
                <h4 className="font-semibold text-gray-800">
                  Request {index + 1}:
                </h4>
                <div className="text-sm text-gray-700 mt-1">
                  <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(log.request, null, 2)}
                  </pre>
                </div>
                {log.response && (
                  <>
                    <h4 className="font-semibold text-green-800 mt-4">
                      Response:
                    </h4>
                    <div className="text-sm text-gray-700 mt-1">
                      <pre className="bg-green-100 p-2 rounded-md text-green-700 whitespace-pre-wrap">
                        {JSON.stringify(log.response, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
                {log.error && (
                  <>
                    <h4 className="font-semibold text-red-800 mt-4">Error:</h4>
                    <div className="text-sm text-gray-700 mt-1">
                      <pre className="bg-red-100 p-2 rounded-md text-red-700 whitespace-pre-wrap">
                        {JSON.stringify(log.error, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiDetails;

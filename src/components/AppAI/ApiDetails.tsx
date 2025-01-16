import React, { useState } from "react";

interface ApiDetailsProps {
  FetchInfo: any;
}

const ApiDetails: React.FC<ApiDetailsProps> = ({ FetchInfo }) => {
  const [showAPIDetails, setShowAPIDetails] = useState(true);

  return (
    <div
      className={` text-black ${
        showAPIDetails ? "h-[50vh] bg-white w-full" : "h-10 w-12 left-[50%]"
      }  overflow-y-auto fixed bottom-0 z-2000`}
    >
      <div
        className="h-10 text-red-400 flex items-center justify-center cursor-pointer"
        onClick={() => setShowAPIDetails(!showAPIDetails)}
      >
        debug
      </div>
      {showAPIDetails ? (
        <div className="p-4">
          <h3>API Request Details</h3>
          <div>
            <strong>{JSON.stringify(FetchInfo.Request)}</strong>
          </div>
          <h3 className="mt-4">API Response Details</h3>
          <div className="text-green-300">
            <strong>{JSON.stringify(FetchInfo.Response)}</strong>
          </div>
          <h3 className="mt-4">API Error</h3>
          <div className="text-red-400">
            <strong>{JSON.stringify(FetchInfo.Error)}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ApiDetails;

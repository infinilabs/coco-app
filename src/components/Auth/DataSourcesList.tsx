import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { DataSourceItem } from "./DataSourceItem";
import { useConnectStore } from "@/stores/connectStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useAppStore } from "@/stores/appStore";

export function DataSourcesList() {
  const datasourceData = useConnectStore((state) => state.datasourceData);
  const setDatasourceData = useConnectStore((state) => state.setDatasourceData);

  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const [refreshLoading, setRefreshLoading] = useState(false);

  async function getDatasourceData() {
    setRefreshLoading(true);
    try {
      const response = await tauriFetch({
        url: `/datasource/_search`,
        method: "GET",
      });
      console.log("datasource", response);
      const data = response.data?.hits?.hits || [];
      setDatasourceData(data, endpoint_http);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
    setRefreshLoading(false);
  }

  useEffect(() => {
    getDatasourceData()
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="flex justify-between text-xl font-medium text-gray-900 dark:text-white">
        Data Source
        <button
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
          onClick={() => getDatasourceData()}
        >
          <RefreshCcw
            className={`w-3.5 h-3.5 ${refreshLoading ? "animate-spin" : ""}`}
          />
        </button>
      </h2>
      <div className="space-y-4">
        {datasourceData[endpoint_http]?.map((source) => (
          <DataSourceItem key={source._id} {...source._source} />
        ))}
      </div>
    </div>
  );
}

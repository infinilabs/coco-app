import {useEffect, useState} from "react";
import {RefreshCcw} from "lucide-react";

import {DataSourceItem} from "./DataSourceItem";
import {useConnectStore} from "@/stores/connectStore";
import {useAppStore} from "@/stores/appStore";
import {invoke} from "@tauri-apps/api/core";

export function DataSourcesList({server}: { server: string }) {
    const datasourceData = useConnectStore((state) => state.datasourceData);
    const setError = useAppStore((state) => state.setError);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const setDatasourceData = useConnectStore((state) => state.setDatasourceData);
    const setConnectorData = useConnectStore((state) => state.setConnectorData);

    function initServerAppData({server}: { server: string }) {
        //fetch datasource data
        invoke("get_connectors_by_server", {id: server})
            .then((res: any) => {
                console.log("get_connectors_by_server", res);
                setConnectorData(res, server);
            })
            .catch((err: any) => {
                setError(err);
                throw err;  // Propagate error back up
            })
            .finally(() => {

            });

        //fetch datasource data
        invoke("get_datasources_by_server", {id: server})
            .then((res: any) => {
                console.log("get_datasources_by_server", res);
                setDatasourceData(res, server);
            })
            .catch((err: any) => {
                setError(err);
                throw err;  // Propagate error back up
            })
            .finally(() => {
            });
    }

    async function getDatasourceData() {
        setRefreshLoading(true);
        try {
            initServerAppData({server});
        } catch (e) {
            setError(e);
        } finally {
            setRefreshLoading(false);
        }
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
                {datasourceData[server]?.map((source) => (
                    <DataSourceItem key={source.id} {...source} />
                ))}
            </div>
        </div>
    );
}

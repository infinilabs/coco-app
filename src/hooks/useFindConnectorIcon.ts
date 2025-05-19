import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

export function useFindConnectorIcon(item: any) {
  const connector_data = useConnectStore((state) => state.connector_data);
  const datasourceData = useConnectStore((state) => state.datasourceData);
  const isTauri = useAppStore((state) => state.isTauri);


  let currentServiceId = item?.querySource?.id;
  if (!isTauri) {
    currentServiceId = "web"
  }

  const id = item?.source?.id || "";

  const result_source = datasourceData[currentServiceId]?.find(
    (data: any) => data.id === id
  );

  const connector_id = result_source?.connector?.id;

  const result_connector = connector_data[currentServiceId]?.find(
    (data: any) => data.id === connector_id
  );

  return result_connector;
}
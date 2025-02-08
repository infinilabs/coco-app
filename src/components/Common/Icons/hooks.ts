import { useConnectStore } from "@/stores/connectStore";

export function useFindConnectorIcon(item: any) {
  const connector_data = useConnectStore((state) => state.connector_data);
  const datasourceData = useConnectStore((state) => state.datasourceData);
  const currentService = useConnectStore((state) => state.currentService);

  const id = item?.source?.id || "";

  const result_source = datasourceData[currentService?.id]?.find(
    (data: any) => data.id === id
  );

  const connector_id = result_source?.connector?.id;

  const result_connector = connector_data[currentService?.id]?.find(
    (data: any) => data.id === connector_id
  );

  return result_connector;
}
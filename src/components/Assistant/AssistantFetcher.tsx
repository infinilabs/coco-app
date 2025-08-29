import { useRef } from "react";

import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { parseSearchQuery, unrequitable } from "@/utils";

interface AssistantFetcherProps {
  debounceKeyword?: string;
  assistantIDs?: string[];
}

export const AssistantFetcher = ({
  debounceKeyword = "",
  assistantIDs = [],
}: AssistantFetcherProps) => {
  const { currentService, currentAssistant, setCurrentAssistant } =
    useConnectStore();

  const lastServerId = useRef<string | null>(null);

  const fetchAssistant = async (params: {
    current: number;
    pageSize: number;
    serverId?: string;
    query?: string;
  }) => {
    try {
      if (await unrequitable()) {
        return {
          total: 0,
          list: [],
        };
      }

      const {
        pageSize,
        current,
        serverId = currentService?.id,
        query,
      } = params;

      const queryParams = parseSearchQuery({
        from: (current - 1) * pageSize,
        size: pageSize,
        query: query ?? debounceKeyword,
        fuzziness: 5,
        filters: {
          enabled: true,
          id: assistantIDs,
        },
      });

      const response = await platformAdapter.fetchAssistant(
        serverId,
        queryParams
      );

      let assistantList = response?.hits?.hits ?? [];

      if (
        !currentAssistant?._id ||
        currentService?.id !== lastServerId.current
      ) {
        setCurrentAssistant(assistantList[0]);
      }
      lastServerId.current = currentService?.id;

      return {
        total: response.hits.total.value,
        list: assistantList,
      };
    } catch (error) {
      setCurrentAssistant(null);
      console.error("assistant_search", error);
      return {
        total: 0,
        list: [],
      };
    }
  };

  return { fetchAssistant };
};

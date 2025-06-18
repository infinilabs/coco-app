import { useRef } from "react";

import { Post } from "@/api/axiosRequest";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";
import { parseSearchQuery, SearchQuery } from "@/utils";

interface AssistantFetcherProps {
  debounceKeyword?: string;
  assistantIDs?: string[];
}

export const AssistantFetcher = ({
  debounceKeyword = "",
  assistantIDs = [],
}: AssistantFetcherProps) => {
  const isTauri = useAppStore((state) => state.isTauri);

  const currentService = useConnectStore((state) => state.currentService);

  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const setCurrentAssistant = useConnectStore((state) => {
    return state.setCurrentAssistant;
  });

  const lastServerId = useRef<string | null>(null);

  const fetchAssistant = async (params: {
    current: number;
    pageSize: number;
    serverId?: string;
    query?: string;
  }) => {
    try {
      if (isTauri && !currentService?.enabled) {
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

      const searchQuery: SearchQuery = {
        from: (current - 1) * pageSize,
        size: pageSize,
        query: query ?? debounceKeyword,
        fuzziness: 5,
        filters: {
          enabled: true,
          id: assistantIDs,
        },
      };

      const queryParams = parseSearchQuery(searchQuery);

      const body: Record<string, any> = {
        serverId,
        queryParams,
      };

      let response: any;

      if (isTauri) {
        if (!currentService?.id) {
          throw new Error("currentService is undefined");
        }

        response = await platformAdapter.commands("assistant_search", body);
      } else {
        body.serverId = undefined;
        const [error, res] = await Post(`/assistant/_search`, body);

        if (error) {
          throw new Error(error);
        }

        response = res;
      }

      let assistantList = response?.hits?.hits ?? [];

      console.log("assistantList", assistantList);

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

import { useRef } from "react";

import { Post } from "@/api/axiosRequest";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

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
  }) => {
    try {
      const { pageSize, current } = params;

      const from = (current - 1) * pageSize;
      const size = pageSize;

      let response: any;

      const body: Record<string, any> = {
        serverId: currentService?.id,
        from,
        size,
      };

      body.query = {
        bool: {
          must: [{ term: { enabled: true } }],
        },
      };

      if (debounceKeyword) {
        body.query.bool.must.push({
          query_string: {
            fields: ["combined_fulltext"],
            query: debounceKeyword,
            fuzziness: "AUTO",
            fuzzy_prefix_length: 2,
            fuzzy_max_expansions: 10,
            fuzzy_transpositions: true,
            allow_leading_wildcard: false,
          },
        });
      }
      if (assistantIDs.length > 0) {
        body.query.bool.must.push({
          terms: {
            id: assistantIDs.map((id) => id),
          },
        });
      }

      if (isTauri) {
        if (!currentService?.id) {
          throw new Error("currentService is undefined");
        }

        response = await platformAdapter.commands("assistant_search", body);
      } else {
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

import { useState, useCallback } from "react";

import type { IChunkData } from "@/types/chat";

export default function useMessageChunkData() {
  const [query_intent, setQuery_intent] = useState<IChunkData>();
  const [tools, setTools] = useState<IChunkData>();
  const [fetch_source, setFetch_source] = useState<IChunkData>();
  const [pick_source, setPick_source] = useState<IChunkData>();
  const [deep_read, setDeep_read] = useState<IChunkData>();
  const [think, setThink] = useState<IChunkData>();
  const [response, setResponse] = useState<IChunkData>();

  const handlers = {
    deal_query_intent: useCallback((data: IChunkData) => {
      setQuery_intent((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
    deal_tools: useCallback((data: IChunkData) => {
      setTools((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
    deal_fetch_source: useCallback((data: IChunkData) => {
      setFetch_source((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
    deal_pick_source: useCallback((data: IChunkData) => {
      setPick_source((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
    deal_deep_read: useCallback((data: IChunkData) => {
      setDeep_read((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + "&" + data.message_chunk,
        };
      });
    }, []),
    deal_think: useCallback((data: IChunkData) => {
      setThink((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
    deal_response: useCallback((data: IChunkData) => {
      setResponse((prev: IChunkData | undefined): IChunkData => {
        if (!prev) return data;
        return {
          ...prev,
          message_chunk: prev.message_chunk + data.message_chunk,
        };
      });
    }, []),
  };

  const clearAllChunkData = () => {
    return new Promise<void>((resolve) => {
      setQuery_intent(undefined);
      setTools(undefined);
      setFetch_source(undefined);
      setPick_source(undefined);
      setDeep_read(undefined);
      setThink(undefined);
      setResponse(undefined);
      setTimeout(resolve, 0);
    });
  };

  return {
    data: {
      query_intent,
      tools,
      fetch_source,
      pick_source,
      deep_read,
      think,
      response,
    },
    handlers,
    clearAllChunkData,
  };
}

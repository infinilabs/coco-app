import { useMemo } from "react";

import { useConnectStore } from "@/stores/connectStore";
import { getEnabledServers } from "@/utils/servers";
import { useServers } from "./useServers";

/**
 * Hook: returns enabled & available servers, plus refresh function.
 */
export function useEnabledServers() {
  const serverList = useConnectStore((s) => s.serverList);
  const { refreshServerList } = useServers();

  const enabledServers = useMemo(() => getEnabledServers(serverList), [serverList]);

  return { enabledServers, refreshServerList };
}
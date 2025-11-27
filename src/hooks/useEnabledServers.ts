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

  const enabledServers = useMemo(() => {
    const list = getEnabledServers(serverList);
    // Further filter to public servers or those with user profile (logged-in)
    return list.filter((s) => s.public || s.profile);
  }, [serverList]);

  return { enabledServers, refreshServerList };
}
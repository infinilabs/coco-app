import type { Server } from "@/types/server";

/**
 * Return enabled and available servers from a server list.
 */
export function getEnabledServers(list: Server[] | any[]): Server[] {
  if (!Array.isArray(list)) return [] as Server[];
  return (list as Server[]).filter((s) => s.enabled && s.available);
}
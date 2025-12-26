import type { ExtensionFileSystemPermission } from "../Settings/Extensions";
import type { FileSystemAccess } from "../Settings/Extensions";
import platformAdapter from "@/utils/platformAdapter";

export const apiPermissionCheck = (
  category: string,
  api: string,
  allowedApis: string[] | null
): boolean => {
  if (!allowedApis) {
    return false;
  }

  const qualifiedApi = `${category}:${api}`;
  return allowedApis.some((a) => a === qualifiedApi);
};

type ReadDirPayload = {
  path: string;
};

const isReadDirPayload = (payload: unknown): payload is ReadDirPayload => {
  if (typeof payload !== "object" || payload == null) return false;
  return typeof (payload as Record<string, unknown>).path === "string";
};

export const extractFsAccessPattern = (
  command: string,
  requestPayload: unknown
): [string, FileSystemAccess] => {
  switch (command) {
    case "read_dir": {
      if (!isReadDirPayload(requestPayload)) {
        throw new Error("invalid payload for read_dir");
      }

      return [requestPayload.path, ["read"]];
    }
    default: {
      throw new Error(`unknown command ${command}`);
    }
  }
};

export const fsPermissionCheck = async (
  command: string,
  requestPayload: unknown,
  fsPermission: ExtensionFileSystemPermission[] | null
): Promise<boolean> => {
  if (!fsPermission) {
    return false;
  }

  const [path, access] = extractFsAccessPattern(command, requestPayload);
  const cleanPath = await platformAdapter.invokeBackend("path_absolute", {
    path,
  });

  for (const permission of fsPermission) {
    if (permission.path === cleanPath) {
      const hasAllRequiredAccess = access.every((requiredAccess) =>
        permission.access.includes(requiredAccess)
      );

      if (hasAllRequiredAccess) {
        return true;
      }
    }
  }

  return false;
};

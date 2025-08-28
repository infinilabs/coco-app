import { useConnectStore } from "@/stores/connectStore";
import { SETTINGS_WINDOW_LABEL } from "@/constants";
import platformAdapter from "@/utils/platformAdapter";
import { useAuthStore } from "@/stores/authStore";
import { useExtensionsStore } from "@/stores/extensionsStore";

export async function getCurrentWindowService() {
  const currentService = useConnectStore.getState().currentService;
  const cloudSelectService = useConnectStore.getState().cloudSelectService;
  const windowLabel = await platformAdapter.getCurrentWindowLabel();

  return windowLabel === SETTINGS_WINDOW_LABEL
    ? cloudSelectService
    : currentService;
}

export async function setCurrentWindowService(service: any, isAll?: boolean) {
  const { setCurrentService, setCloudSelectService } =
    useConnectStore.getState();
  // all refresh logout
  if (isAll) {
    setCloudSelectService(service);
    return setCurrentService(service);
  }
  // current refresh
  const windowLabel = await platformAdapter.getCurrentWindowLabel();

  if (windowLabel === SETTINGS_WINDOW_LABEL) {
    const {
      aiOverviewServer,
      setAiOverviewServer,
      quickAiAccessServer,
      setQuickAiAccessServer,
    } = useExtensionsStore.getState();

    if (aiOverviewServer?.id === service.id) {
      setAiOverviewServer(service);
    }

    if (quickAiAccessServer?.id === service.id) {
      setQuickAiAccessServer(service);
    }

    return setCloudSelectService(service);
  }

  setCurrentService(service);
}

export async function handleLogout(serverId?: string) {
  const setIsCurrentLogin = useAuthStore.getState().setIsCurrentLogin;
  const { serverList, setServerList } = useConnectStore.getState();

  const service = await getCurrentWindowService();

  const id = serverId || service?.id;
  if (!id) return;

  // Update the status first
  setIsCurrentLogin(false);
  if (service?.id === id) {
    await setCurrentWindowService({ ...service, profile: null }, true);
  }
  const updatedServerList = serverList.map((server) =>
    server.id === id ? { ...server, profile: null } : server
  );
  setServerList(updatedServerList);
}

import { useConnectStore } from "@/stores/connectStore";
import { SETTINGS_WINDOW_LABEL } from "@/constants";
import platformAdapter from "@/utils/platformAdapter";
import { useAuthStore } from "@/stores/authStore";

export async function getCurrentWindowService() {
  const currentService = useConnectStore.getState().currentService;
  const cloudSelectService = useConnectStore.getState().cloudSelectService;
  const windowLabel = await platformAdapter.getCurrentWindowLabel();

  return windowLabel === SETTINGS_WINDOW_LABEL
    ? cloudSelectService
    : currentService;
}

export async function setCurrentWindowService(service: any) {
  const windowLabel = await platformAdapter.getCurrentWindowLabel();
  const { setCurrentService, setCloudSelectService } =
    useConnectStore.getState();

  return windowLabel === SETTINGS_WINDOW_LABEL
    ? setCloudSelectService(service)
    : setCurrentService(service);
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
    await setCurrentWindowService({ ...service, profile: null });
  }
  const updatedServerList = serverList.map((server) =>
    server.id === id ? { ...server, profile: null } : server
  );
  setServerList(updatedServerList);
}

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw,
  Globe,
  PackageOpen,
  GitFork,
  CalendarSync,
  Trash2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  onOpenUrl,
  getCurrent as getCurrentDeepLinkUrls,
} from "@tauri-apps/plugin-deep-link";

import { UserProfile } from "./UserProfile";
import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { ConnectService } from "./ConnectService";
import { OpenBrowserURL } from "@/utils/index";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useConnectStore } from "@/stores/connectStore";
import bannerImg from "@/assets/images/coco-cloud-banner.jpeg";

export default function CocoCloud() {
  const [error, setError] = useState<string | null>(null);

  const [isConnect, setIsConnect] = useState(true);

  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const endpoint = useAppStore((state) => state.endpoint);

  const auth = useAuthStore((state) => state.auth);
  const setAuth = useAuthStore((state) => state.setAuth);
  const userInfo = useAuthStore((state) => state.userInfo);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const defaultService = useConnectStore((state) => state.defaultService);
  const currentService = useConnectStore((state) => state.currentService);
  const setDefaultService = useConnectStore((state) => state.setDefaultService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);
  const deleteOtherService = useConnectStore(
    (state) => state.deleteOtherService
  );

  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  useEffect(() => {
    console.log("currentService", currentService);
    setLoading(false);
    setRefreshLoading(false);
    setError(null);
    setEndpoint(currentService.endpoint);
    setIsConnect(true);
  }, [JSON.stringify(currentService)]);

  const getProfile = useCallback(async () => {
    const response: any = await tauriFetch({
      url: `/account/profile`,
      method: "GET",
    });
    console.log("getProfile", response);
    setUserInfo(response.data || {}, endpoint);
  }, [endpoint]);

  const handleOAuthCallback = useCallback(
    async (code: string | null, provider: string | null) => {
      if (!code) {
        setError("No authorization code received");
        return;
      }

      try {
        console.log("Handling OAuth callback:", { code, provider });
        const response: any = await tauriFetch({
          url: `/auth/request_access_token?request_id=${app_uid}`,
          method: "GET",
          headers: {
            "X-API-TOKEN": code,
          },
        });
        console.log(
          "response",
          `/auth/request_access_token?request_id=${app_uid}`,
          code,
          response
        );

        if (response.data?.access_token) {
          await setAuth(
            {
              token: response.data?.access_token,
              expires: response.data?.expire_at,
              plan: { upgraded: false, last_checked: 0 },
            },
            endpoint
          );

          getProfile();
        } else {
          await setAuth(undefined, endpoint);
          setError("Sign in failed: " + response.data?.error?.reason);
        }

        getCurrentWindow()
          .setFocus()
          .catch(() => {});
      } catch (e) {
        console.error("Sign in failed:", error);
        setError("Sign in failed: catch");
        await setAuth(undefined, endpoint);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [app_uid, endpoint]
  );

  const handleUrl = (url: string) => {
    try {
      // url = "coco://oauth_callback?code=cu8ag982sdb06e0j6k3g&provider=coco-cloud"
      const urlObject = new URL(url);
      console.log("urlObject:", urlObject);

      const code = urlObject.searchParams.get("code");
      const provider = urlObject.searchParams.get("provider");
      handleOAuthCallback(code, provider);

      // switch (urlObject.hostname) {
      //   case "/oauth_callback":

      //     break;

      //   default:
      //     console.log("Unhandled deep link path:", urlObject.pathname);
      // }
    } catch (err) {
      console.error("Failed to parse URL:", err);
      setError("Invalid URL format");
    }
  };

  // Fetch the initial deep link intent
  useEffect(() => {
    // handleUrl("");
    getCurrentDeepLinkUrls()
      .then((urls) => {
        console.log("URLs:", urls);
        if (urls && urls.length > 0) {
          handleUrl(urls[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to get initial URLs:", err);
        setError("Failed to get initial URLs");
      });

    const unlisten = onOpenUrl((urls) => handleUrl(urls[0]));

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [app_uid]);

  const LoginClick = useCallback(() => {
    if (loading) return;
    setAuth(undefined, endpoint);

    let uid = uuidv4();
    setAppUid(uid);

    console.log("LoginClick", uid, currentService.auth_provider.sso.url);

    OpenBrowserURL(
      `${currentService.auth_provider.sso.url}/?provider=coco-cloud&product=coco&request_id=${uid}`
    );

    setLoading(true);
  }, [JSON.stringify(currentService)]);

  function goToHref(url: string) {
    OpenBrowserURL(url);
  }

  const refreshClick = useCallback(() => {
    setRefreshLoading(true);
    tauriFetch({
      url: `/provider/_info`,
      method: "GET",
    })
      .then((res) => {
        setEndpoint(res.data.endpoint);
        setCurrentService(res.data || {});
        if (res.data?.endpoint === "https://coco.infini.cloud/") {
          setDefaultService(res.data);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  }, [JSON.stringify(defaultService)]);

  function addService() {
    setIsConnect(false);
  }

  const deleteClick = useCallback(() => {
    deleteOtherService(currentService);
    setAuth(undefined, endpoint);
    setUserInfo({}, endpoint);
  }, [JSON.stringify(currentService), endpoint]);

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900">
      <Sidebar addService={addService} />

      <main className="flex-1 p-4 py-8">
        <div>
          {error && (
            <div className="text-red-500 dark:text-red-400 mb-4">
              Error: {error}
            </div>
          )}
        </div>

        {isConnect ? (
          <div className="max-w-4xl mx-auto">
            <div className="w-full rounded-[4px] bg-[rgba(229,229,229,1)] dark:bg-gray-800 mb-6">
              <img
                src={currentService.provider.banner || bannerImg}
                alt="banner"
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-gray-900 dark:text-white font-medium">
                  {currentService.name}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                  onClick={() => goToHref(currentService.provider.website)}
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                  onClick={() => refreshClick()}
                >
                  <RefreshCcw
                    className={`w-3.5 h-3.5 ${
                      refreshLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>
                {currentService.endpoint !== defaultService.endpoint ? (
                  <button
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                    onClick={() => deleteClick()}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#ff4747]" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-8">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex">
                <span className="flex items-center gap-1">
                  <PackageOpen className="w-4 h-4" />{" "}
                  {currentService.provider.name}
                </span>
                <span className="mx-4">|</span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-4 h-4" />{" "}
                  {currentService.version.number}
                </span>
                <span className="mx-4">|</span>
                <span className="flex items-center gap-1">
                  <CalendarSync className="w-4 h-4" /> {currentService.updated}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {currentService.provider.description}
              </p>
            </div>

            {currentService.auth_provider.sso.url ? (
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Account Information
                </h2>
                {auth && auth[endpoint] ? (
                  <UserProfile userInfo={userInfo[endpoint]} />
                ) : (
                  <div>
                    <button
                      className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors mb-3"
                      onClick={LoginClick}
                    >
                      {loading ? "Login..." : "Login"}
                    </button>
                    <button
                      className="text-xs text-[#0096FB] dark:text-blue-400 block"
                      onClick={() =>
                        goToHref(currentService.provider.privacy_policy)
                      }
                    >
                      EULA | Privacy Policy
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {auth && auth[endpoint] ? <DataSourcesList /> : null}
          </div>
        ) : (
          <ConnectService setIsConnect={setIsConnect} />
        )}
      </main>
    </div>
  );
}

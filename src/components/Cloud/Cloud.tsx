import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCcw,
  Globe,
  PackageOpen,
  GitFork,
  CalendarSync,
  Trash2,
  Copy,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  onOpenUrl,
  getCurrent as getCurrentDeepLinkUrls,
} from "@tauri-apps/plugin-deep-link";
import { invoke } from "@tauri-apps/api/core";

import { UserProfile } from "./UserProfile";
import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { Connect } from "./Connect";
import { OpenURLWithBrowser } from "@/utils";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import bannerImg from "@/assets/images/coco-cloud-banner.jpeg";

export default function Cloud() {
  const SidebarRef = useRef<{ refreshData: () => void }>(null);

  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);

  const [isConnect, setIsConnect] = useState(true);

  const ssoRequestID = useAppStore((state) => state.ssoRequestID);
  const setSSORequestID = useAppStore((state) => state.setSSORequestID);

  const endpoint = useAppStore((state) => state.endpoint);

  const currentService = useConnectStore((state) => state.currentService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const serverList = useConnectStore((state) => state.serverList);
  const setServerList = useConnectStore((state) => state.setServerList);

  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // fetch the servers
  useEffect(() => {
    fetchServers(true);
  }, []);

  useEffect(() => {
    console.log("currentService", currentService);
    setLoading(false);
    setRefreshLoading(false);
    setError("");
    setIsConnect(true);
  }, [JSON.stringify(currentService)]);

  const fetchServers = async (resetSelection: boolean) => {
    invoke("list_coco_servers")
      .then((res: any) => {
        console.log("list_coco_servers", res);
        setServerList(res);
        if (resetSelection && res.length > 0) {
          console.log("setCurrentService", res[res.length - 1]);
          setCurrentService(res[res.length - 1]);
        } else {
          console.warn("Service list is empty or last item has no id");
        }
      })
      .catch((err: any) => {
        setError(err);
        console.error(err);
      });
  };

  const add_coco_server = (endpointLink: string) => {
    if (!endpointLink) {
      throw new Error("Endpoint is required");
    }
    if (
      !endpointLink.startsWith("http://") &&
      !endpointLink.startsWith("https://")
    ) {
      throw new Error("Invalid Endpoint");
    }

    setRefreshLoading(true);

    return invoke("add_coco_server", { endpoint: endpointLink })
      .then((res: any) => {
        console.log("add_coco_server", res);
        fetchServers(false)
          .then((r) => {
            console.log("fetchServers", r);
            setCurrentService(res);
          })
          .catch((err: any) => {
            console.error("fetchServers failed:", err);
            setError(err);
            throw err; // Propagate error back up to outer promise chain
          });
      })
      .catch((err: any) => {
        // Handle the invoke error
        console.error("add coco server failed:", err);
        setError(err);
        throw err; // Propagate error back up
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  };

  const handleOAuthCallback = useCallback(
    async (code: string | null, serverId: string | null) => {
      if (!code) {
        setError("No authorization code received");
        return;
      }

      try {
        console.log("Handling OAuth callback:", { code, serverId });
        await invoke("handle_sso_callback", {
          serverId: serverId, // Make sure 'server_id' is the correct argument
          requestId: ssoRequestID, // Make sure 'request_id' is the correct argument
          code: code,
        });

        if (serverId != null) {
          refreshClick(serverId);
        }

        getCurrentWindow()
          .setFocus()
          .catch((err) => {
            setError(err);
          });
      } catch (e) {
        console.error("Sign in failed:", e);
        setError("SSO login failed: " + e);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [ssoRequestID, endpoint]
  );

  const handleUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      console.log("handle urlObject:", urlObject);

      // TODO, pass request_id and check with local, if the request_id are same, then continue
      const reqId = urlObject.searchParams.get("request_id");
      const code = urlObject.searchParams.get("code");

      if (reqId != ssoRequestID) {
        console.log("Request ID not matched, skip");
        setError("Request ID not matched, skip");
        return;
      }

      const serverId = currentService?.id;
      handleOAuthCallback(code, serverId);
    } catch (err) {
      console.error("Failed to parse URL:", err);
      setError("Invalid URL format: " + err);
    }
  };

  // Fetch the initial deep link intent
  useEffect(() => {
    // Test the handleUrl function
    // handleUrl("coco://oauth_callback?code=cui88lg2sdb4dnu97jpgypcugrskkt1i3venntth7gk52exnq8hxufxvqn8hhegoaw369s394bcyb6ehtnhz&request_id=642a985c-6baa-4ec8-be41-d8c6ddbc0e60&provider=coco-cloud/");
    // Function to handle pasted URL
    const handlePaste = (event: any) => {
      const pastedText = event.clipboardData.getData("text");
      console.log("handle paste text:", pastedText);
      if (isValidCallbackUrl(pastedText)) {
        // Handle the URL as if it's a deep link
        console.log("handle callback on paste:", pastedText);
        handleUrl(pastedText);
      }
    };

    // Function to check if the pasted URL is valid for our deep link scheme
    const isValidCallbackUrl = (url: string) => {
      return url && url.startsWith("coco://oauth_callback");
    };

    // Adding event listener for paste events
    document.addEventListener("paste", handlePaste);

    getCurrentDeepLinkUrls()
      .then((urls) => {
        console.log("URLs:", urls);
        if (urls && urls.length > 0) {
          if (isValidCallbackUrl(urls[0])) {
            handleUrl(urls[0]);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to get initial URLs:", err);
        setError("Failed to get initial URLs: " + err);
      });

    const unlisten = onOpenUrl((urls) => handleUrl(urls[0]));

    return () => {
      unlisten.then((fn) => fn());
      document.removeEventListener("paste", handlePaste);
    };
  }, [ssoRequestID]);

  const LoginClick = useCallback(() => {
    if (loading) return; // Prevent multiple clicks if already loading

    let requestID = uuidv4();
    setSSORequestID(requestID);

    // Generate the login URL with the current appUid
    const url = `${currentService?.auth_provider?.sso?.url}/?provider=${currentService?.id}&product=coco&request_id=${requestID}`;

    console.log("Open SSO link, requestID:", ssoRequestID, url);

    // Open the URL in a browser
    OpenURLWithBrowser(url);

    // Start loading state
    setLoading(true);
  }, [ssoRequestID, loading, currentService]);

  const refreshClick = (id: string) => {
    setRefreshLoading(true);
    invoke("refresh_coco_server_info", { id })
      .then((res: any) => {
        console.log("refresh_coco_server_info", id, JSON.stringify(res));
        fetchServers(false).then((r) => {
          console.log("fetchServers", r);
        });
        // update currentService
        setCurrentService(res);
      })
      .catch((err: any) => {
        setError(err);
        console.error(err);
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  };

  function onAddServer() {
    setIsConnect(false);
  }
  function onLogout(id: string) {
    console.log("onLogout", id);
    setRefreshLoading(true);
    invoke("logout_coco_server", { id })
      .then((res: any) => {
        console.log("logout_coco_server", id, JSON.stringify(res));
        refreshClick(id);
      })
      .catch((err: any) => {
        setError(err);
        console.error(err);
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  }

  const remove_coco_server = (id: string) => {
    invoke("remove_coco_server", { id })
      .then((res: any) => {
        console.log("remove_coco_server", id, JSON.stringify(res));
        fetchServers(true).then((r) => {
          console.log("fetchServers", r);
        });
      })
      .catch((err: any) => {
        // TODO display the error message
        setError(err);
        console.error(err);
      });
  };

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900">
      <Sidebar
        ref={SidebarRef}
        onAddServer={onAddServer}
        serverList={serverList}
      />

      <main className="flex-1 p-4 py-8">
        {isConnect ? (
          <div className="max-w-4xl mx-auto">
            <div className="w-full rounded-[4px] bg-[rgba(229,229,229,1)] dark:bg-gray-800 mb-6">
              <img
                width="100%"
                src={currentService?.provider?.banner || bannerImg}
                alt="banner"
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-gray-900 dark:text-white font-medium">
                  {currentService?.name}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                  onClick={() =>
                    OpenURLWithBrowser(currentService?.provider?.website)
                  }
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                  onClick={() => refreshClick(currentService?.id)}
                >
                  <RefreshCcw
                    className={`w-3.5 h-3.5 ${
                      refreshLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>

                {!currentService?.builtin && (
                  <button
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
                    onClick={() => remove_coco_server(currentService?.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#ff4747]" />
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex">
                <span className="flex items-center gap-1">
                  <PackageOpen className="w-4 h-4" />{" "}
                  {currentService?.provider?.name}
                </span>
                <span className="mx-4">|</span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-4 h-4" />{" "}
                  {currentService?.version?.number}
                </span>
                <span className="mx-4">|</span>
                <span className="flex items-center gap-1">
                  <CalendarSync className="w-4 h-4" /> {currentService?.updated}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {currentService?.provider?.description}
              </p>
            </div>

            {currentService?.auth_provider?.sso?.url ? (
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Account Information
                </h2>
                {currentService?.profile ? (
                  <UserProfile
                    server={currentService?.id}
                    userInfo={currentService?.profile}
                    onLogout={onLogout}
                  />
                ) : (
                  <div>
                    {/* Login Button (conditionally rendered when not loading) */}
                    {!loading && (
                      <button
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors mb-3"
                        onClick={LoginClick}
                      >
                        Login
                      </button>
                    )}

                    {/* Cancel Button and Copy URL button while loading */}
                    {loading && (
                      <div className="flex items-center space-x-2">
                        <button
                          className="px-6 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors mb-3"
                          onClick={() => setLoading(false)} // Reset loading state
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${currentService?.auth_provider?.sso?.url}/?provider=${currentService?.id}&product=coco&request_id=${ssoRequestID}`
                            );
                          }}
                          className="text-xl text-blue-500 hover:text-blue-600"
                        >
                          <Copy className="inline mr-2" />{" "}
                          {/* Lucide Copy Icon */}
                        </button>
                      </div>
                    )}

                    {/* Privacy Policy Link */}
                    <button
                      className="text-xs text-[#0096FB] dark:text-blue-400 block"
                      onClick={() =>
                        OpenURLWithBrowser(
                          currentService?.provider?.privacy_policy
                        )
                      }
                    >
                      EULA | Privacy Policy
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {currentService?.profile ? (
              <DataSourcesList server={currentService?.id} />
            ) : null}
          </div>
        ) : (
          <Connect setIsConnect={setIsConnect} onAddServer={add_coco_server} />
        )}
      </main>
    </div>
  );
}

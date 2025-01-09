import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as shell from "@tauri-apps/plugin-shell";

import { UserProfile } from "./UserProfile";
import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { ConnectService } from "./ConnectService";
// import { OpenBrowserURL } from "@/utils/index";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import callbackTemplate from "@/components/Auth/callback.template";
import { tauriFetch } from "@/api/tauriFetchClient";
import {
  onOpenUrl,
  getCurrent as getCurrentDeepLinkUrls,
  register
} from "@tauri-apps/plugin-deep-link";

export default function CocoCloud() {
  const appStore = useAppStore();

  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthCallback = (code: string | null, state: string | null) => {
    if (!code) {
      setError("No authorization code received");
      return;
    }

    console.log("Handling OAuth callback:", { code, state });
  };

  const handleUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      console.error("1111111:", urlObject);

      switch (urlObject.pathname) {
        case "/oauth/callback":
          const code = urlObject.searchParams.get("code");
          const state = urlObject.searchParams.get("state");
          handleOAuthCallback(code, state);
          break;

        default:
          console.log("Unhandled deep link path:", urlObject.pathname);
      }

      setLastUrl(url);
    } catch (err) {
      console.error("Failed to parse URL:", err);
      setError("Invalid URL format");
    }
  };

  // Fetch the initial deep link intent
  useEffect(() => {
    register("coco").then((urls) => {
      console.error("44444 URLs:", urls);
    })
    .catch((err) => {
      console.error("666666:", err);
    });

    getCurrentDeepLinkUrls()
      .then((urls) => {
        console.error("22222 URLs:", urls);
        if (urls && urls.length > 0) {
          handleUrl(urls[0]);
          console.error("URLs:", urls);
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
  }, []);
  //

  const [isLogin] = useState(false);
  const [isConnect] = useState(true);

  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { auth, setAuth } = useAuthStore();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onOpenUrl((urls: any) => {
      console.log("deep link:", urls);
    });

    let unsubscribe: (() => void) | undefined;

    const setupAuthListener = async () => {
      try {
        if (!auth) {
          // Replace the current route with signin
          // navigate("/signin", { replace: true });
        }
      } catch (error) {
        console.error("Failed to set up auth listener:", error);
      }
    };

    setupAuthListener();

    // Clean up logic on unmount
    return () => {
      const cleanup = async () => {
        try {
          await invoke("plugin:oauth|stop");
        } catch (e) {
          // Ignore errors if no server is running
        }
        if (unsubscribe) {
          unsubscribe();
        }
      };

      cleanup();
    };
  }, [auth]);

  async function signIn() {
    let res: (url: URL) => void;

    try {
      const stopListening = await listen(
        // "oauth://url",
        "coco://oauth_callback",
        (data: { payload: string }) => {
          console.log(111, data.payload);

          // if (!data.payload.includes("provider")) {
          //   return;
          // }

          const urlObject = new URL(data.payload);
          res(urlObject);
        }
      );

      // Stop any existing OAuth server first
      try {
        await invoke("plugin:oauth|stop");
      } catch (e) {
        // Ignore errors if no server is running
      }

      const port: string = await invoke("plugin:oauth|start", {
        config: {
          response: callbackTemplate,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
          // Add a cleanup function to stop the server after handling the request
          cleanup: true,
        },
      });

      let uid = app_uid;
      if (!uid) {
        uid = uuidv4();
        setAppUid(uid);
      }

      await shell.open(
        `${endpoint_http}/sso/login?provider=coco-cloud&product=coco&request_id=${uid}&port=${port}`
      );

      await onOpenUrl((urls: any) => {
        console.log("deep link:", urls);
      });

      const url = await new Promise<URL>((r) => {
        res = r;
      });
      stopListening();

      const code = url.searchParams.get("code");
      const provider = url.searchParams.get("provider");

      if (!code || provider !== "coco-cloud") {
        throw new Error("Invalid token or expires");
      }

      const response: any = await tauriFetch({
        url: `/auth/request_access_token?request_id=${uid}`,
        method: "GET",
        baseURL: appStore.endpoint_http,
        headers: {
          "X-API-TOKEN": code,
        },
      });
      // { "access_token":xxx, "expire_at": "unix_timestamp_in_s" }

      await setAuth({
        token: response?.access_token,
        expires: response?.expire_at,
        plan: { upgraded: false, last_checked: 0 },
      });

      getCurrentWindow()
        .setFocus()
        .catch(() => {});

      return navigate("/ui/settings");
    } catch (error) {
      console.error("Sign in failed:", error);
      await setAuth(undefined);
      throw error;
    }
  }

  async function initializeUser() {
    // let uid = app_uid;
    // if (!uid) {
    //   uid = uuidv4();
    //   setAppUid(uid);
    // }
    // const response = await fetch("/api/register", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ uid }),
    // });
    // const { token } = await response.json();
    // localStorage.setItem("auth_token", token);
    // OpenBrowserURL(
    //   `https://app.coco.rs/sso/login?provider=coco-cloud&request_id=${uid}`
    // );

    setLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function LoginClick() {
    initializeUser();
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1">
        <div>
          {error && (
            <div className="text-red-500 dark:text-red-400">Error: {error}</div>
          )}

          {lastUrl && (
            <div className="text-gray-700 dark:text-gray-300">
              Last opened URL: {lastUrl}
            </div>
          )}
        </div>

        {isConnect ? (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-md border border-gray-200">
                  <Cloud className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-[#333]">Coco Cloud</span>
                </div>
                <span className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md">
                  Available
                </span>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Cloud className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-8">
              <div className="text-sm text-gray-500 mb-4">
                <span>Service provision: INFINI Labs</span>
                <span className="mx-4">|</span>
                <span>Version Number: v2.3.0</span>
                <span className="mx-4">|</span>
                <span>Update time: 2023-05-12</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Coco Cloud provides users with a cloud storage and data
                integration platform that supports account registration and data
                source management. Users can integrate multiple data sources
                (such as Google Drive, yuque, GitHub, etc.), easily access and
                search for files, documents and codes across platforms, and
                achieve efficient data collaboration and management.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Account Information
              </h2>
              {isLogin ? (
                <UserProfile name="Rain" email="an121245@gmail.com" />
              ) : (
                <button
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  onClick={LoginClick}
                >
                  {loading ? "Login..." : "Login"}
                </button>
              )}
            </div>

            {isLogin ? <DataSourcesList /> : null}
          </div>
        ) : (
          <ConnectService />
        )}
      </main>
    </div>
  );
}

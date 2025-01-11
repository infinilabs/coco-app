import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { UserProfile } from "./UserProfile";
import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { ConnectService } from "./ConnectService";
import { OpenBrowserURL } from "@/utils/index";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import {
  onOpenUrl,
  getCurrent as getCurrentDeepLinkUrls,
} from "@tauri-apps/plugin-deep-link";

export default function CocoCloud() {
  const appStore = useAppStore();

  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [info2, setInfo2] = useState<string | null>(null);

  const [isConnect] = useState(true);

  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { auth, setAuth } = useAuthStore();

  const [loading, setLoading] = useState(false);

  const getProfile = async () => {
    const response: any = await tauriFetch({
      url: `/profile`,
      method: "GET",
      baseURL: appStore.endpoint_http,
    });
    console.log("getProfile", response);

    setInfo2(JSON.stringify(response))
  }

  const handleOAuthCallback = async (
    code: string | null,
    provider: string | null
  ) => {
    if (!code) {
      setError("No authorization code received");
      return;
    }

    // mock
    // code = "d11feeab43f6c3e48a43"
    // provider = "coco-cloud"

    try {
      console.log("Handling OAuth callback:", { code, provider });
      const response: any = await tauriFetch({
        url: `/auth/request_access_token?request_id=${app_uid}`,
        method: "GET",
        baseURL: appStore.endpoint_http,
        headers: {
          "X-API-TOKEN": code,
        },
      });
      // { "access_token":xxx, "expire_at": "unix_timestamp_in_s" }
      console.log("response", response); 
      setInfo(JSON.stringify(response))

      getProfile()

      await setAuth({
        token: response.data?.access_token,
        expires: response.data?.expire_at,
        plan: { upgraded: false, last_checked: 0 },
      });

      getCurrentWindow()
        .setFocus()
        .catch(() => {});
    } catch (e) {
      console.error("Sign in failed:", error);
      await setAuth(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      console.error("1111111:", urlObject);

      switch (urlObject.pathname) {
        case "oauth_callback":
          const code = urlObject.searchParams.get("code");
          const provider = urlObject.searchParams.get("provider");
          handleOAuthCallback(code, provider);
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
    // coco://oauth_calback?code=&provider=
    // handleOAuthCallback("cu0bpu53q95r66at2010", "coco-cloud");
    // 
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

  function LoginClick() {
    let uid = app_uid;
    if (!uid) {
      uid = uuidv4();
      setAppUid(uid);
    }

    // const response = await fetch("/api/register", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ uid }),
    // });
    // const { token } = await response.json();
    // localStorage.setItem("auth_token", token);

    OpenBrowserURL(
      `${endpoint_http}/sso/login/github?provider=coco-cloud&product=coco&request_id=${uid}`
    );

    setLoading(true);
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
          
          {info && (
            <div className="text-gray-700 dark:text-gray-300">
              Info : {info}
            </div>
          )}
          
          {info2 && (
            <div className="text-gray-700 dark:text-gray-300">
              info2 : {info2}
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
              {auth ? (
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

            {auth ? <DataSourcesList /> : null}
          </div>
        ) : (
          <ConnectService />
        )}
      </main>
    </div>
  );
}

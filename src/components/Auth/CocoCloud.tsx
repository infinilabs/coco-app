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

  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [info2, setInfo2] = useState<string | null>(null);

  const [isConnect] = useState(true);

  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { auth, setAuth  } = useAuthStore();
  const userInfo = useAuthStore((state) => state.userInfo);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);

  const [loading, setLoading] = useState(false);

  const getProfile = async () => {
    const response: any = await tauriFetch({
      url: `/provider/account/profile`,
      method: "GET",
    });
    console.log("getProfile", response);
    // {"data":{"username":"johndoe","email":"johndoe@example.com","avatar":"https://example.com/avatar.jpg","roles":["admin","editor"],"preferences":{"theme":"dark","language":"en"}},"status":200,"statusText":"OK","headers":{}}

    setUserInfo(response.data || {})
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
        headers: {
          "X-API-TOKEN": code,
        },
      });
      // { "access_token":xxx, "expire_at": "unix_timestamp_in_s" }
      console.log("response", `/auth/request_access_token?request_id=${app_uid}`, code, response); 
      setInfo(JSON.stringify(response))

      if (response.data?.access_token) {
        await setAuth({
          token: response.data?.access_token,
          expires: response.data?.expire_at,
          plan: { upgraded: false, last_checked: 0 },
        });

        getProfile()

      }

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

      setLastUrl(url);
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
  }, []);

  function LoginClick() {
    let uid = uuidv4();
    setAppUid(uid);

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
                <UserProfile name={userInfo.username || "-"} email={userInfo.email || "-"} />
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

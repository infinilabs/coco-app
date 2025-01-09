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

export default function CocoCloud() {
  const appStore = useAppStore();

  const [isLogin] = useState(false);
  const [isConnect] = useState(true);

  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { auth, setAuth } = useAuthStore();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      // coco://oauth_callback
      const stopListening = await listen(
        "oauth://url",
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
        `${endpoint_http}/sso/login?provider=coco-cloud&product=coco&reques_id=${uid}&port=${port}`
      );

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
        url: `/auth/request_access_token?reques_id=${uid}`,
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
    //   `https://app.coco.rs/sso/login?provider=coco-cloud&reques_id=${uid}`
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

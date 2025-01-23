import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as shell from "@tauri-apps/plugin-shell";

import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { OpenBrowserURL } from "@/utils/index";
import logoImg from "@/assets/32x32.png";
import callbackTemplate from "@/components/Auth/callback.template";
import { clientEnv } from "@/utils/env";

export default function Account() {
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
        if (!(auth && auth[endpoint_http])) {
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
  }, [JSON.stringify(auth)]);

  async function signIn() {
    let res: (url: URL) => void;

    try {
      const stopListening = await listen(
        "oauth://url",
        (data: { payload: string }) => {
          if (!data.payload.includes("token")) {
            return;
          }

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

      await shell.open(
        `${endpoint_http || clientEnv.COCO_SERVER_URL}/api/desktop/session/request?port=${port}`
      );

      const url = await new Promise<URL>((r) => {
        res = r;
      });
      stopListening();

      const token = url.searchParams.get("token");
      const user_id = url.searchParams.get("user_id");
      const expires = Number(url.searchParams.get("expires"));
      if (!token || !expires || !user_id) {
        throw new Error("Invalid token or expires");
      }

      await setAuth({
        token,
        user_id,
        expires,
        plan: { upgraded: false, last_checked: 0 },
      }, endpoint_http);

      getCurrentWindow()
        .setFocus()
        .catch(() => {});

      return navigate("/");
    } catch (error) {
      console.error("Sign in failed:", error);
      await setAuth(undefined, endpoint_http);
      throw error;
    }
  }

  async function initializeUser() {
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
    OpenBrowserURL(`http://localhost:1420/login?uid=${uid}`);

    setLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function LoginClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
    event.preventDefault();
    initializeUser();
  }
  return (
    <div className="h-[450px] bg-gradient-to-br from-purple-100 via-purple-200 to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
        <div className="animate-pulse">
          <img
            src={logoImg}
            alt="logo"
            className="w-12 h-12 text-red-500 dark:text-red-300"
          />
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Get Started
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm dark:text-gray-300">
            You need to log in or create an account to view your organizations,
            manage your custom extensions.
          </p>
        </div>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="#"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Sign Up
          </a>
          <a
            href="#"
            className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100"
            onClick={LoginClick}
          >
            {loading ? "Signing In..." : "Sign In"}
          </a>
        </div>
      </div>
    </div>
  );
}

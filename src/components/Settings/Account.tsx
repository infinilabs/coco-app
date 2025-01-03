import { v4 as uuidv4 } from "uuid";

import { useAppStore } from "@/stores/appStore";
import { OpenBrowserURL } from "@/utils/index";
import logoImg from "@/assets/32x32.png";

export default function Account() {
  const app_uid = useAppStore((state) => state.app_uid);
  const setAppUid = useAppStore((state) => state.setAppUid);

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
            Log In <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

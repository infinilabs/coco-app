import { FC, memo, useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import {
  getCurrent as getCurrentDeepLinkUrls,
  onOpenUrl,
} from "@tauri-apps/plugin-deep-link";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { UserProfile } from "./UserProfile";
import { OpenURLWithBrowser } from "@/utils";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";
import { copyToClipboard } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { handleLogout } from "@/commands/servers";

interface ServiceAuthProps {
  setRefreshLoading: (loading: boolean) => void;
  refreshClick: (id: string) => void;
}

const ServiceAuth = memo(
  ({ setRefreshLoading, refreshClick }: ServiceAuthProps) => {
    const { t } = useTranslation();

    const ssoRequestID = useAppStore((state) => state.ssoRequestID);
    const setSSORequestID = useAppStore((state) => state.setSSORequestID);

    const addError = useAppStore((state) => state.addError);

    const currentService = useConnectStore((state) => state.currentService);

    const [loading, setLoading] = useState(false);

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

    const onLogout = useCallback((id: string) => {
      setRefreshLoading(true);
      platformAdapter
        .commands("logout_coco_server", id)
        .then((res: any) => {
          console.log("logout_coco_server", id, JSON.stringify(res));
          handleLogout(id);
        })
        .finally(() => {
          setRefreshLoading(false);
        });
    }, []);

    const handleOAuthCallback = useCallback(
      async (code: string | null, serverId: string | null) => {
        if (!code || !serverId) {
          addError("No authorization code received");
          return;
        }

        try {
          console.log("Handling OAuth callback:", { code, serverId });
          await platformAdapter.commands("handle_sso_callback", {
            serverId: serverId, // Make sure 'server_id' is the correct argument
            requestId: ssoRequestID, // Make sure 'request_id' is the correct argument
            code: code,
          });

          if (serverId != null) {
            refreshClick(serverId);
          }

          getCurrentWindow().setFocus();
        } catch (e) {
          console.error("Sign in failed:", e);
        } finally {
          setLoading(false);
        }
      },
      [ssoRequestID]
    );

    const handleUrl = (url: string) => {
      try {
        const urlObject = new URL(url.trim());
        console.log("handle urlObject:", urlObject);

        // pass request_id and check with local, if the request_id are same, then continue
        const reqId = urlObject.searchParams.get("request_id");
        const code = urlObject.searchParams.get("code");

        if (reqId != ssoRequestID) {
          console.log("Request ID not matched, skip");
          addError("Request ID not matched, skip");
          return;
        }

        const serverId = currentService?.id;
        handleOAuthCallback(code, serverId);
      } catch (err) {
        console.error("Failed to parse URL:", err);
        addError("Invalid URL format: " + err);
      }
    };

    // Fetch the initial deep link intent
    useEffect(() => {
      // Function to handle pasted URL
      const handlePaste = (event: any) => {
        const pastedText = event.clipboardData.getData("text").trim();
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
            if (isValidCallbackUrl(urls[0].trim())) {
              handleUrl(urls[0]);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to get initial URLs:", err);
          addError("Failed to get initial URLs: " + err);
        });

      const unlisten = onOpenUrl((urls) => handleUrl(urls[0]));

      return () => {
        unlisten.then((fn) => fn());
        document.removeEventListener("paste", handlePaste);
      };
    }, [ssoRequestID]);

    useEffect(() => {
      setLoading(false);
    }, [currentService]);

    if (!currentService?.auth_provider?.sso?.url) {
      return null;
    }

    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("cloud.accountInfo")}
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
            {!loading && <LoginButton LoginClick={LoginClick} />}

            {/* Cancel Button and Copy URL button while loading */}
            {loading && (
              <LoadingState
                onCancel={() => setLoading(false)}
                onCopy={() => {
                  copyToClipboard(
                    `${currentService?.auth_provider?.sso?.url}/?provider=${currentService?.id}&product=coco&request_id=${ssoRequestID}`
                  );
                }}
              />
            )}

            <div className="flex items-center gap-2">
              {/* EULA Link */}
              <button
                className="text-xs text-[#0096FB] dark:text-blue-400 block"
                onClick={() =>
                  OpenURLWithBrowser(currentService?.provider?.eula)
                }
              >
                {t("cloud.eula")}
              </button>

              <span className="text-xs text-[#0096FB] dark:text-blue-400 block">
                |
              </span>

              {/* Privacy Policy Link */}
              <button
                className="text-xs text-[#0096FB] dark:text-blue-400 block"
                onClick={() =>
                  OpenURLWithBrowser(currentService?.provider?.privacy_policy)
                }
              >
                {t("cloud.privacyPolicy")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default ServiceAuth;

interface LoginButtonProps {
  LoginClick: () => void;
}

const LoginButton: FC<LoginButtonProps> = memo((props) => {
  const { LoginClick } = props;
  const { t } = useTranslation();

  return (
    <button
      className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors mb-3"
      onClick={LoginClick}
      aria-label={t("cloud.login")}
    >
      {t("cloud.login")}
    </button>
  );
});

interface LoadingStateProps {
  onCancel: () => void;
  onCopy: () => void;
}

const LoadingState: FC<LoadingStateProps> = memo((props) => {
  const { onCancel, onCopy } = props;
  const { t } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <button
        className="px-6 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors mb-3"
        onClick={onCancel}
      >
        {t("cloud.cancel")}
      </button>
      <button
        onClick={onCopy}
        className="text-xl text-blue-500 hover:text-blue-600"
      >
        <Copy className="inline mr-2" />{" "}
      </button>
      <div className="text-justify italic text-xs">
        {t("cloud.manualCopyLink")}
      </div>
    </div>
  );
});

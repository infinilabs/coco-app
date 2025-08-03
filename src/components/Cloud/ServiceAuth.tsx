import { FC, memo, useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import {
  getCurrent as getCurrentDeepLinkUrls,
  onOpenUrl,
} from "@tauri-apps/plugin-deep-link";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

import { UserProfile } from "./UserProfile";
import { OpenURLWithBrowser } from "@/utils";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";
import { copyToClipboard } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useServers } from "@/hooks/useServers";

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

    const cloudSelectService = useConnectStore((state) => state.cloudSelectService);

    const { logoutServer } = useServers();

    const [loading, setLoading] = useState(false);

    const LoginClick = useCallback(() => {
      if (loading) return; // Prevent multiple clicks if already loading

      let requestID = uuidv4();
      setSSORequestID(requestID);

      // Generate the login URL with the current appUid
      const url = `${cloudSelectService?.auth_provider?.sso?.url}/?provider=${cloudSelectService?.id}&product=coco&request_id=${requestID}`;

      console.log("Open SSO link, requestID:", ssoRequestID, url);

      // Open the URL in a browser
      OpenURLWithBrowser(url);

      // Start loading state
      setLoading(true);
    }, [ssoRequestID, loading, cloudSelectService]);

    const onLogout = useCallback(
      (id: string) => {
        setRefreshLoading(true);
        logoutServer(id).finally(() => {
          setRefreshLoading(false);
        });
      },
      [logoutServer]
    );

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

    // Coco server OAuthCallback deeplink handler.
    const handleDeeplinkOAuthCallback = useCallback(
      async (url: URL) => {
        try {
          const reqId = url.searchParams.get("request_id");
          const code = url.searchParams.get("code");

          if (reqId != ssoRequestID) {
            console.log("Request ID not matched, skip");
            addError("Request ID not matched, skip");
            return;
          }

          const serverId = cloudSelectService?.id;
          handleOAuthCallback(code, serverId);
        } catch (err) {
          console.error("Failed to parse OAuth callback URL:", err);
          addError("Invalid OAuth callback URL format: " + err);
        }
      },
      [ssoRequestID, cloudSelectService, handleOAuthCallback]
    );

    // Install extension deeplink handler
    //
    // Example URL: "coco://install_extension_from_store?id=<Extension ID>"
    const handleDeeplinkInstallExtensionFromStore = useCallback(
      async (url: URL) => {
        const extension_id = url.searchParams.get("id");
        if (extension_id == null) {
          console.warn("received an invalid \"", url.hostname, "\" deeplink, missing argument \"id\"");
          return;
        }

        try {
          // extension_id has been checked that it is NOT NULL
          invoke("install_extension_from_store", { id: extension_id });
        } catch (install_error) {
          console.error("Failed to install extension \"", extension_id, "\, error: ", install_error);
        }
      },
      []
    );

    // Helper function to dispatch deeplink handling.
    const handleUrl = useCallback(
      (url: string) => {
        console.debug("handling deeplink URL ", url);

        try {
          const urlObject = new URL(url.trim());
          const deeplinkIdentifier = urlObject.hostname;

          invoke("rust_println", { msg: String(deeplinkIdentifier) });

          switch (deeplinkIdentifier) {
            case "oauth_callback":
              handleDeeplinkOAuthCallback(urlObject);
              break;
            case "install_extension_from_store":
              handleDeeplinkInstallExtensionFromStore(urlObject);
              break;
            default:
              console.error("Unknown deep link: ", url);
              addError("Unknown deep link: " + url);
          }
        } catch (err) {
          console.error("Failed to parse URL:", err);
          addError("Invalid URL format: " + err);
        }
      },
      [handleDeeplinkOAuthCallback, handleDeeplinkInstallExtensionFromStore]
    );

    // Fetch the initial deep link intent
    useEffect(() => {
      // Function to handle pasted URL
      const handlePaste = (event: any) => {
        const pastedText = event.clipboardData.getData("text").trim();
        console.log("handle paste text:", pastedText);
        if (isValidOAuthCallbackUrl(pastedText)) {
          // Handle the URL as if it's a deep link
          console.log("handle callback on paste:", pastedText);
          handleUrl(pastedText);
        }
      };

      const isValidOAuthCallbackUrl = (url: string) => {
        return url && url.startsWith("coco://oauth_callback");
      };

      // Adding event listener for paste events
      document.addEventListener("paste", handlePaste);

      getCurrentDeepLinkUrls()
        .then((urls) => {
          console.log("URLs:", urls);
          if (urls && urls.length > 0) {
            handleUrl(urls[0]);
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
    }, [cloudSelectService]);

    if (!cloudSelectService?.auth_provider?.sso?.url) {
      return null;
    }

    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("cloud.accountInfo")}
        </h2>
        {cloudSelectService?.profile ? (
          <UserProfile
            server={cloudSelectService?.id}
            userInfo={cloudSelectService?.profile}
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
                    `${cloudSelectService?.auth_provider?.sso?.url}/?provider=${cloudSelectService?.id}&product=coco&request_id=${ssoRequestID}`
                  );
                }}
              />
            )}

            <div className="flex items-center gap-2">
              {/* EULA Link */}
              <button
                className="text-xs text-[#0096FB] dark:text-blue-400 block"
                onClick={() =>
                  OpenURLWithBrowser(cloudSelectService?.provider?.eula)
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
                  OpenURLWithBrowser(cloudSelectService?.provider?.privacy_policy)
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

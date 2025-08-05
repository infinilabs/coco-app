import { FC, memo, useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

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

    const language = useAppStore((state) => state.language);
    const addError = useAppStore((state) => state.addError);
    const ssoRequestID = useAppStore((state) => state.ssoRequestID);
    const setSSORequestID = useAppStore((state) => state.setSSORequestID);

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

    // handle oauth success event
    useEffect(() => {
      const unlistenOAuth = platformAdapter.listenEvent('oauth_success', (event) => {
        const { serverId } = event.payload;
        if (serverId) {
          refreshClick(serverId);
          addError(language === "zh" ? "登录成功" : "Login Success", "info");
        }
        setLoading(false);
      });

      return () => {
        unlistenOAuth.then(fn => fn());
      };
    }, [refreshClick]);

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

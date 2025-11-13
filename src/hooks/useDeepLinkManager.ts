import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  getCurrent as getCurrentDeepLinkUrls,
  onOpenUrl,
} from "@tauri-apps/plugin-deep-link";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import { useTranslation } from "react-i18next";
import { MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL } from "@/constants";
import { useAsyncEffect, useEventListener } from "ahooks";

export interface DeepLinkHandler {
  pattern: string;
  handler: (url: URL) => Promise<void> | void;
}

export function useDeepLinkManager() {
  const addError = useAppStore((state) => state.addError);
  const { t } = useTranslation();

  // handle oauth callback
  const handleOAuthCallback = useCallback(async (url: URL) => {
    try {
      const reqId = url.searchParams.get("request_id");
      const code = url.searchParams.get("code");

      const { ssoRequestID } = useAppStore.getState();
      const { cloudSelectService } = useConnectStore.getState();

      if (reqId !== ssoRequestID) {
        console.log("Request ID not matched, skip");
        addError("Request ID not matched, skip");
        return;
      }

      const serverId = cloudSelectService?.id;
      if (!code || !serverId) {
        addError("No authorization code received");
        return;
      }

      console.log("Handling OAuth callback:", { code, serverId });
      await platformAdapter.commands("handle_sso_callback", {
        serverId: serverId,
        requestId: ssoRequestID,
        code: code,
      });

      // trigger oauth success event
      platformAdapter.emitEvent("oauth_success", { serverId });
      getCurrentWebviewWindow().setFocus();
    } catch (err) {
      console.error("Failed to parse OAuth callback URL:", err);
      addError("Invalid OAuth callback URL format: " + err);
    }
  }, []);

  // handle install extension from store
  const handleInstallExtension = useCallback(async (url: URL) => {
    const extensionId = url.searchParams.get("id");
    if (!extensionId) {
      return console.warn(
        'received an invalid install_extension_from_store deeplink, missing argument "id"'
      );
    }

    try {
      await platformAdapter.showWindow();

      await invoke("install_extension_from_store", { id: extensionId });

      // trigger extension install success event
      platformAdapter.emitEvent("extension_install_success", { extensionId });
      addError(t("deepLink.extensionInstallSuccessfully"), "info");
      console.log("Extension installed successfully:", extensionId);
    } catch (error) {
      addError(String(error));
    }
  }, []);

  // handle deep link
  const handlers: DeepLinkHandler[] = [
    {
      pattern: "oauth_callback",
      handler: async (url) => {
        const windowLabel = await platformAdapter.getCurrentWindowLabel();

        if (windowLabel !== SETTINGS_WINDOW_LABEL) return;

        handleOAuthCallback(url);
      },
    },
    {
      pattern: "install_extension_from_store",
      handler: async (url) => {
        const windowLabel = await platformAdapter.getCurrentWindowLabel();

        if (windowLabel !== MAIN_WINDOW_LABEL) return;

        handleInstallExtension(url);
      },
    },
  ];

  // handle deep link
  const handleUrl = useCallback(
    (url: string) => {
      console.debug("handling deeplink URL", url);

      try {
        const urlObject = new URL(url.trim());
        const deeplinkIdentifier = urlObject.hostname;

        // find handler by pattern
        const handler = handlers.find((h) => h.pattern === deeplinkIdentifier);

        if (handler) {
          handler.handler(urlObject);
        } else {
          console.error("Unknown deep link:", url);
          addError("Unknown deep link: " + url);
        }
      } catch (err) {
        console.error("Failed to parse URL:", err);
        addError("Invalid URL format: " + err);
      }
    },
    [handlers]
  );

  // handle paste text
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text")?.trim();
      console.log("handle paste text:", pastedText);

      // coco://oauth_callback
      if (pastedText && pastedText.startsWith("coco://oauth_callback")) {
        console.log("handle deeplink on paste:", pastedText);
        handleUrl(pastedText);
      }
    },
    [handleUrl]
  );

  // get initial deep link
  useAsyncEffect(async () => {
    try {
      const urls = await getCurrentDeepLinkUrls();

      console.log("Initial DeepLinkUrls:", urls);

      if (urls && urls.length > 0) {
        handleUrl(urls[0]);
      }
    } catch (error) {
      addError("Failed to get initial URLs: " + error);
    }
  }, []);

  // handle deep link on paste
  useEffect(() => {
    // handle new deep link
    const unlisten = onOpenUrl((urls) => {
      console.log("onOpenUrl urls", urls);

      handleUrl(urls[0]);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // add paste event listener
  useEventListener("paste", handlePaste);

  return {
    handleUrl,
  };
}

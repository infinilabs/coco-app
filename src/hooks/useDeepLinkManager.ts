import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  getCurrent as getCurrentDeepLinkUrls,
  onOpenUrl,
} from '@tauri-apps/plugin-deep-link';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useAppStore } from '@/stores/appStore';
import { useConnectStore } from '@/stores/connectStore';
import platformAdapter from '@/utils/platformAdapter';

export interface DeepLinkHandler {
  pattern: string;
  handler: (url: URL) => Promise<void> | void;
}

export function useDeepLinkManager() {
  const language = useAppStore((state) => state.language);
  const addError = useAppStore((state) => state.addError);
  const ssoRequestID = useAppStore((state) => state.ssoRequestID);
  const cloudSelectService = useConnectStore((state) => state.cloudSelectService);

  // handle oauth callback
  const handleOAuthCallback = useCallback(async (url: URL) => {
    try {
      const reqId = url.searchParams.get('request_id');
      const code = url.searchParams.get('code');

      if (reqId !== ssoRequestID) {
        console.log('Request ID not matched, skip');
        addError('Request ID not matched, skip');
        return;
      }

      const serverId = cloudSelectService?.id;
      if (!code || !serverId) {
        addError('No authorization code received');
        return;
      }

      console.log('Handling OAuth callback:', { code, serverId });
      await platformAdapter.commands('handle_sso_callback', {
        serverId: serverId,
        requestId: ssoRequestID,
        code: code,
      });

      // trigger oauth success event
      platformAdapter.emitEvent('oauth_success', { serverId });
      getCurrentWindow().setFocus();
    } catch (err) {
      console.error('Failed to parse OAuth callback URL:', err);
      addError('Invalid OAuth callback URL format: ' + err);
    }
  }, [ssoRequestID, cloudSelectService, addError]);

  // handle install extension from store
  const handleInstallExtension = useCallback(async (url: URL) => {
    const extensionId = url.searchParams.get('id');
    if (!extensionId) {
      console.warn('received an invalid install_extension_from_store deeplink, missing argument "id"');
      return;
    }

    try {
      await invoke('install_extension_from_store', { id: extensionId });
      
      // trigger extension install success event
      platformAdapter.emitEvent('extension_install_success', { extensionId });
      addError(language === "zh" ? "插件安装成功" : "Plugin Install Success", "info");
      console.log('Extension installed successfully:', extensionId);
    } catch (installError) {
      console.error('Failed to install extension', extensionId, ', error: ', installError);
      addError(`Failed to install extension: ${installError}`);
    }
  }, [addError]);

  // handle deep link
  const handlers: DeepLinkHandler[] = [
    {
      pattern: 'oauth_callback',
      handler: handleOAuthCallback,
    },
    {
      pattern: 'install_extension_from_store',
      handler: handleInstallExtension,
    },
  ];

  // handle deep link
  const handleUrl = useCallback((url: string) => {
    console.debug('handling deeplink URL', url);

    try {
      const urlObject = new URL(url.trim());
      const deeplinkIdentifier = urlObject.hostname;

      // find handler by pattern
      const handler = handlers.find(h => h.pattern === deeplinkIdentifier);
      
      if (handler) {
        handler.handler(urlObject);
      } else {
        console.error('Unknown deep link:', url);
        addError('Unknown deep link: ' + url);
      }
    } catch (err) {
      console.error('Failed to parse URL:', err);
      addError('Invalid URL format: ' + err);
    }
  }, [handlers, addError]);

  // handle paste text
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text')?.trim();
    console.log('handle paste text:', pastedText);
    
    if (pastedText && pastedText.startsWith('coco://')) {
      console.log('handle deeplink on paste:', pastedText);
      handleUrl(pastedText);
    }
  }, [handleUrl]);

  // handle deep link on paste
  useEffect(() => {
    // add paste event listener
    document.addEventListener('paste', handlePaste);

    // get initial deep link
    getCurrentDeepLinkUrls()
      .then((urls) => {
        console.log('Initial URLs:', urls);
        if (urls && urls.length > 0) {
          handleUrl(urls[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to get initial URLs:', err);
        addError('Failed to get initial URLs: ' + err);
      });

    // handle new deep link
    const unlisten = onOpenUrl((urls) => handleUrl(urls[0]));

    return () => {
      unlisten.then((fn) => fn());
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleUrl, handlePaste, addError]);

  return {
    handleUrl,
  };
}

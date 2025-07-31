import type { IConfig } from "@/utils/console-custom";

declare namespace I {
  export type AppConf = {
    theme: "light" | "dark" | "auto";
    stay_on_top: boolean;
    ask_mode: boolean;
    mac_header_hidden: boolean;
  };

  export interface SVG extends React.SVGProps<SVGSVGElement> {
    children?: React.ReactNode;
    size?: number;
    title?: string;
    action?: boolean;
    onClick?: (e: React.MouseEvent) => void;
  }
}

declare global {
  interface Window {
    __TAURI__?: {
      writeText(text: string): Promise<void>;
      invoke(command: string, payload?: Record<string, unknown>): Promise<any>;
      dialog: {
        save(options?: Record<string, unknown>): Promise<string | null>;
      };
      fs: {
        writeBinaryFile(path: string, data: Uint8Array): Promise<void>;
        writeTextFile(path: string, data: string): Promise<void>;
      };
      notification: {
        requestPermission(): Promise<Permission>;
        isPermissionGranted(): Promise<boolean>;
        sendNotification(options: string | Options): void;
      };
      updater: {
        checkUpdate(): Promise<UpdateResult>;
        installUpdate(): Promise<void>;
        onUpdaterEvent(
          handler: (status: UpdateStatusResult) => void
        ): Promise<UnlistenFn>;
      };
      http: {
        fetch<T>(
          url: string,
          options?: Record<string, unknown>
        ): Promise<Response<T>>;
      };
    };
    __TAURI_INTERNALS__?: any;
    __TAURI_OS_PLUGIN_INTERNALS__?: any;

    bLog: (...data: any[]) => void;
    infoLog: (
      config?: Partial<import("./utils/console-custom").IConfig>
    ) => (...data: any[]) => void;
    createLogger: typeof import("./utils/console-custom").default;
  }

  // global variable declarations
  var bLog: (...data: any[]) => void;
  var infoLog: (
    config?: Partial<import("./utils/console-custom").IConfig>
  ) => (...data: any[]) => void;
  var createLogger: typeof import("./utils/console-custom").default;
}

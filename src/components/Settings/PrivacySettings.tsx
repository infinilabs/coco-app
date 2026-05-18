import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Mic,
  Accessibility as AccessibilityIcon,
  Monitor,
  Workflow,
  ExternalLink,
  RefreshCcw,
  Check,
  X,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

import platformAdapter from "@/utils/platformAdapter";
import { isMac } from "@/utils/platform";

type Status = "granted" | "denied" | "unknown";

interface PermissionRow {
  id: string;
  i18nKey: string; // privacy.items.<key>
  icon: LucideIcon;
  // macOS x-apple.systempreferences anchor used to deep-link the right pane.
  systemSettingsUrl: string;
  /** Returns true if granted, false if denied/unknown. */
  check?: () => Promise<boolean>;
  /** Triggers the OS prompt (if applicable). */
  request?: () => Promise<unknown> | void;
}

/**
 * Settings → Privacy & Permissions panel.
 *
 * Lists the macOS permissions Coco AI requests and provides deep links to
 * the relevant System Settings panes plus an in-app refresh so users can
 * verify their changes without restarting the app.
 *
 * Why this exists: macOS's TCC system silently caches denials. If a user
 * (or a previous dev build) ever clicked "Don't Allow", the OS will NOT
 * prompt again, and the feature appears broken with no recoverable error.
 * This panel surfaces the current status and shows the documented escape
 * hatch (`tccutil reset`). The app cannot run `tccutil` itself because it
 * is sandboxed.
 */
const PrivacySettings = () => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [refreshing, setRefreshing] = useState(false);

  const rows: PermissionRow[] = [
    {
      id: "camera",
      i18nKey: "camera",
      icon: Camera,
      systemSettingsUrl:
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
      check: () => platformAdapter.checkCameraPermission(),
      request: () => platformAdapter.requestCameraPermission(),
    },
    {
      id: "microphone",
      i18nKey: "microphone",
      icon: Mic,
      systemSettingsUrl:
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
      check: () => platformAdapter.checkMicrophonePermission(),
      request: () => platformAdapter.requestMicrophonePermission(),
    },
    {
      id: "accessibility",
      i18nKey: "accessibility",
      icon: AccessibilityIcon,
      systemSettingsUrl:
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
      // No direct check in the adapter; status will be "unknown".
    },
    {
      id: "screenRecording",
      i18nKey: "screenRecording",
      icon: Monitor,
      systemSettingsUrl:
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
      check: () => platformAdapter.checkScreenRecordingPermission(),
      request: () => platformAdapter.requestScreenRecordingPermission(),
    },
    {
      id: "automation",
      i18nKey: "automation",
      icon: Workflow,
      systemSettingsUrl:
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
    },
  ];

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const next: Record<string, Status> = {};
    await Promise.all(
      rows.map(async (row) => {
        if (!row.check) {
          next[row.id] = "unknown";
          return;
        }
        try {
          const ok = await row.check();
          next[row.id] = ok ? "granted" : "denied";
        } catch (err) {
          console.error(`[Privacy] check failed for ${row.id}:`, err);
          next[row.id] = "unknown";
        }
      })
    );
    setStatuses(next);
    setRefreshing(false);
    // We intentionally don't include `rows` in deps: it is reconstructed
    // each render but its shape is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMac) return;
    refresh();
  }, [refresh]);

  if (!isMac) {
    // The whole TCC story is macOS-only; on other OSes show a short note
    // rather than misleading "denied" rows.
    return (
      <div className="text-sm text-[#666] dark:text-white/60 p-4">
        {t("privacy.title")} —{" "}
        <span className="opacity-70">macOS only</span>
      </div>
    );
  }

  const renderStatus = (s: Status) => {
    if (s === "granted") {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
          <Check size={12} />
          {t("privacy.status.granted")}
        </span>
      );
    }
    if (s === "denied") {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <X size={12} />
          {t("privacy.status.denied")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 dark:text-gray-400">
        <HelpCircle size={12} />
        {t("privacy.status.unknown")}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("privacy.title")}
          </h2>
          <p className="mt-1 text-sm text-[#666] dark:text-white/60">
            {t("privacy.description")}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[#e5e5e5] dark:border-white/10 text-[#333] dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCcw
            size={12}
            className={refreshing ? "animate-spin" : undefined}
          />
          {t("privacy.actions.refresh")}
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-[#e5e5e5] dark:divide-white/10 rounded-lg border border-[#e5e5e5] dark:border-white/10">
        {rows.map((row) => {
          const Icon = row.icon;
          const status = statuses[row.id] ?? "unknown";
          return (
            <li
              key={row.id}
              className="flex items-center gap-3 px-4 py-3 first:rounded-t-lg last:rounded-b-lg"
            >
              <Icon
                size={18}
                className="text-[#666] dark:text-white/60 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#333] dark:text-white/90">
                    {t(`privacy.items.${row.i18nKey}.name`)}
                  </span>
                  {renderStatus(status)}
                </div>
                <p className="text-xs text-[#666] dark:text-white/50 mt-0.5">
                  {t(`privacy.items.${row.i18nKey}.description`)}
                </p>
              </div>
              <button
                onClick={() =>
                  platformAdapter.openUrl(row.systemSettingsUrl)
                }
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[#e5e5e5] dark:border-white/10 text-[#333] dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"
                title={row.systemSettingsUrl}
              >
                <ExternalLink size={12} />
                {t("privacy.actions.open")}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 text-xs text-[#333] dark:text-white/80">
        <p className="font-medium mb-1">{t("privacy.tccHint.title")}</p>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-snug text-[#555] dark:text-white/70 m-0">
          {t("privacy.tccHint.body")}
        </pre>
      </div>
    </div>
  );
};

export default PrivacySettings;

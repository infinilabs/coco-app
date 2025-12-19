import { useEffect } from "react";
import { X, AlertCircle, AlertTriangle, Info } from "lucide-react";

import { useAppStore } from "@/stores/appStore";

interface ErrorNotificationProps {
  duration?: number;
  autoClose?: boolean;
  isTauri?: boolean;
}

const ErrorNotification = ({
  duration = 3000,
  autoClose = true,
  isTauri = true,
}: ErrorNotificationProps) => {
  const errors = useAppStore((state) => state.errors);
  const removeError = useAppStore((state) => state.removeError);
  const suppressErrors = useAppStore((state) => state.suppressErrors);

  useEffect(() => {
    if (!autoClose) return;

    const timer = setInterval(() => {
      const now = Date.now();
      errors.forEach((error) => {
        if (now - error.timestamp > duration) {
          removeError(error.id);
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [errors, duration, autoClose]);

  if (errors.length === 0 || suppressErrors) return null;

  // Only show the latest error to avoid overwhelming the user
  const visibleError = errors[errors.length - 1];
  const remainingCount = Math.max(0, errors.length - 1);

  return (
    <div
      className={`${
        isTauri ? "fixed" : "absolute"
      } bottom-10 right-4 z-50 max-w-[calc(100%-32px)] space-y-2`}
    >
      <div
        key={visibleError.id}
        className={`flex justify-between gap-4 items-center p-4 rounded-lg shadow-lg ${
          visibleError.type === "error"
            ? "bg-red-50 dark:bg-red-900"
            : visibleError.type === "warning"
            ? "bg-yellow-50 dark:bg-yellow-900"
            : "bg-blue-50 dark:bg-blue-900"
        }`}
      >
        <div className="flex items-center">
          {visibleError.type === "error" && (
            <AlertCircle className="size-5 shrink-0 text-red-500 mr-2" />
          )}
          {visibleError.type === "warning" && (
            <AlertTriangle className="size-5 shrink-0 text-yellow-500 mr-2" />
          )}
          {visibleError.type === "info" && (
            <Info className="size-5 shrink-0 text-blue-500 mr-2" />
          )}

          <span className="text-sm text-gray-700 dark:text-gray-200">
            {visibleError.message}
          </span>

          {remainingCount > 0 && (
            <span className="ml-2 px-2 py-1 text-xs rounded-md bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300">
              +{remainingCount}
            </span>
          )}
        </div>

        <X
          className="size-5 shrink-0 ml-4 cursor-pointer text-gray-400 hover:text-gray-600"
          onClick={() => removeError(visibleError.id)}
        />
      </div>
    </div>
  );
};

export default ErrorNotification;

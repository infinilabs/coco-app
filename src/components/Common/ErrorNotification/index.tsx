import { useEffect } from "react";
import { X, AlertCircle, AlertTriangle, Info } from "lucide-react";

import { useAppStore } from "@/stores/appStore";

interface ErrorNotificationProps {
  duration?: number;
  autoClose?: boolean;
}

const ErrorNotification = ({
  duration = 5000,
  autoClose = false 
 }: ErrorNotificationProps) => {
  const errors = useAppStore((state) => state.errors);
  const removeError = useAppStore((state) => state.removeError);

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

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-50 space-y-2">
      {errors.map((error) => (
        <div
          key={error.id}
          className={`flex justify-between gap-4 items-center p-4 rounded-lg shadow-lg ${
            error.type === "error"
              ? "bg-red-50 dark:bg-red-900"
              : error.type === "warning"
              ? "bg-yellow-50 dark:bg-yellow-900"
              : "bg-blue-50 dark:bg-blue-900"
          }`}
        >
          <div className="flex">
            {error.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            )}
            {error.type === "warning" && (
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            )}
            {error.type === "info" && (
              <Info className="w-5 h-5 text-blue-500 mr-2" />
            )}

            <span className="text-sm text-gray-700 dark:text-gray-200">
              {error.message}
            </span>
          </div>

          <X
            className="w-5 h-5 ml-4 cursor-pointer text-gray-400 hover:text-gray-600"
            onClick={() => removeError(error.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ErrorNotification;

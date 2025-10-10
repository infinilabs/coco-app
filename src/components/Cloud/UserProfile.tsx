import { User, LogOut } from "lucide-react";

import { UserProfile as UserInfo } from "@/types/server";
import { useState } from "react";

interface UserProfileProps {
  server: string; //server's id
  userInfo: UserInfo;
  onLogout: (server: string) => void;
}

export function UserProfile({ server, userInfo, onLogout }: UserProfileProps) {
  const handleLogout = () => {
    onLogout(server);
  };

  const [imageLoadError, setImageLoadError] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          {userInfo?.avatar && !imageLoadError ? (
            <img
              src={userInfo?.avatar}
              alt=""
              className="w-6 h-6 dark:drop-shadow-[0_0_6px_rgb(255,255,255)]"
              onError={() => {
                setImageLoadError(true);
              }}
            />
          ) : (
            <User className="w-6 h-6 text-gray-500 dark:text-gray-400 dark:drop-shadow-[0_0_6px_rgb(255,255,255)]" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-900 dark:text-white">
              {userInfo?.name || "-"}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 border border-[rgba(228,229,239,1)] dark:border-gray-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {userInfo?.email || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

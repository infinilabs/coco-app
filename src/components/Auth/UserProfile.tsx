import { User, Edit, LogOut } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";

interface UserProfileProps {
  name: string;
  email: string;
}

export function UserProfile({ name, email }: UserProfileProps) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);

  const handleLogout = () => {
    setAuth(undefined)
    setUserInfo({})
  };

  return (
    <div className="space-y-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
        <User className="w-6 h-6 text-gray-500" />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">{name}</span>
          <button className="text-gray-400 hover:text-gray-600">
            <Edit className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm text-gray-500">{email}</span>
      </div>
    </div>
    <button 
        onClick={handleLogout}
        className="flex items-center space-x-1 text-red-500 hover:text-red-600"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
  </div>
  );
}

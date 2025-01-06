import { Cloud } from "lucide-react";
import { UserProfile } from "./UserProfile";
import { DataSourcesList } from "./DataSourcesList";

export default function CocoCloud() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-md border border-gray-200">
              <Cloud className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Coco Cloud</span>
            </div>
            <span className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md">
              Available
            </span>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Cloud className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-4">
            <span>Service provision: INFINI Labs</span>
            <span className="mx-4">|</span>
            <span>Version Number: v2.3.0</span>
            <span className="mx-4">|</span>
            <span>Update time: 2023-05-12</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Coco Cloud provides users with a cloud storage and data integration
            platform that supports account registration and data source
            management. Users can integrate multiple data sources (such as
            Google Drive, yuque, GitHub, etc.), easily access and search for
            files, documents and codes across platforms, and achieve efficient
            data collaboration and management.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            Login
          </button>
        </div>

        <UserProfile name="Rain" email="an121245@gmail.com" />
        <DataSourcesList />
      </div>
    </div>
  );
}

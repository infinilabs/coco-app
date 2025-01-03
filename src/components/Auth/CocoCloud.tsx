import { Cloud } from "lucide-react";
import { UserProfile } from './UserProfile';
import { DataSourcesList } from './DataSourcesList';

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
              可用
            </span>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Cloud className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-4">
            <span>服务提供: INFINI Labs</span>
            <span className="mx-4">|</span>
            <span>版本号: v2.3.0</span>
            <span className="mx-4">|</span>
            <span>更新时间: 2023年5月12日</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Coco Cloud
            用户提供云存储和数据集成平台，支持账户注册、数据源管理。用户可集成多种数据源（如
            Google Drive、诸雀、GitHub
            等），轻松访问和搜索跨平台的文件、文档和代码，实现高效的数据协作与管理。
          </p>
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">账户信息</h2>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            Login
          </button>
        </div>

        <UserProfile 
          name="张"
          email="an121245@gmail.com"
        />
        <DataSourcesList />
      </div>
    </div>
  );
}

import { Cloud, Plus } from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 border-r border-gray-200 bg-white">
      <div className="p-4">
        <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg mb-6">
          <Cloud className="w-5 h-5" />
          <span className="font-medium">Coco Cloud</span>
          <div className="flex-1" />
          <button className="text-blue-600 hover:text-blue-700">
            <Cloud className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-500 px-3 mb-2">
            Third-party services
          </div>

          <button className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Calendar, User, Clock } from "lucide-react";

interface DocumentDetailProps {
  documentId?: string;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  documentId,
}) => {
  if (!documentId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        请选择一个文档查看详情
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          产品需求规划文档
        </h2>

        <div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>2024-02-20</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>张小明</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>最近更新于 2小时前</span>
            </div>
          </div>
        </div>
      </div>

      <img
        src="https://images.unsplash.com/photo-1664575602276-acd073f104c1"
        alt="Document preview"
        className="w-full aspect-video object-cover rounded-xl shadow-md"
      />

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          文档概述
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          本文档详细说明了2024年Q1的产品规划方向和具体功能需求。包含了用户研究结果、
          竞品分析、功能优先级排序等重要内容。产品团队可以基于此文档进行后续的设计和开发工作。
        </p>

        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-6">
          主要内容
        </h3>
        <ul className="list-disc pl-4 text-gray-600 dark:text-gray-300 space-y-2">
          <li>用户痛点分析与解决方案</li>
          <li>核心功能详细说明</li>
          <li>交互流程设计</li>
          <li>技术可行性评估</li>
          <li>项目时间节点规划</li>
        </ul>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-6">
          通过实施本文档中规划的功能，我们期望能够提升用户体验，增强产品竞争力，
          实现Q1的业务增长目标。
        </p>
      </div>
    </div>
  );
};

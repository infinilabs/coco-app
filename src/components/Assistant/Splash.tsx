import { MoveRight } from "lucide-react";
import FileIcon from "../Common/Icons/FileIcon";
import ItemIcon from "../Common/Icons/ItemIcon";

const Splash = () => {
  const list = [
    {
      icon: "",
      title: "专利审查自动化助手",
      desc: "辅助进行形式审查、文书规范性检查，生成初步审查意见，提高审查效率。",
    },
    {
      icon: "",
      title: "专利文件智能管理助手",
      desc: "自动分类、标签和归档专利相关文档，支持全文检索与版本管理，提升资料管理效率。",
    },
    {
      icon: "",
      title: "知产法典通",
      desc: "快速检索并解读与知识产权相关的法律条款，支持中英文对照及常见问题解析。",
    },
    {
      icon: "",
      title: "专利技术趋势分析助手",
      desc: "聚焦技术领域发展，基于专利数据洞察产业趋势，辅助立项、决策与技术布局。",
    },
    {
      icon: "",
      title: "专利多语言翻译专家",
      desc: "支持中、英、日、德等多语种专利翻译，术语精准，适用于国际申请与文件交流。",
    },
    {
      icon: "",
      title: "专利图表智能生成助手",
      desc: "自动将专利数据转化为可视化图表，支持技术分布、申请趋势、竞争格局等多种图示。",
    },
    {
      icon: "",
      title: "AI 专利外观检索助手",
      desc: "通过图像识别与对比技术，快速检索相似外观专利，适用于外观设计新颖性判断。",
    },
    {
      icon: "",
      title: "专利侵权风险预警员",
      desc: "分析目标专利与现有产品之间的技术特征，辅助判断潜在侵权风险，降低法律风险。",
    },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center px-6 pt-6 text-[#333] dark:text-white">
      <div>logo</div>

      <div className="mt-3 mb-6 text-lg font-medium">
        AI 专利工具箱，快速开启高效工作之旅
      </div>

      <ul className="flex flex-wrap -m-1">
        {list.map((item) => {
          const { icon, title, desc } = item;

          return (
            <li key={title} className="w-1/2 p-1">
              <div className="group px-3 py-2 text-sm rounded-xl border dark:border-[#262626] bg-white dark:bg-black cursor-pointer transition hover:!border-[#0087FF]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ItemIcon item={item} className="size-4" />

                    <span>{title}</span>
                  </div>

                  <MoveRight className="size-4 transition group-hover:text-[#0087FF]" />
                </div>

                <div className="mt-1 text-xs text-[#999]">{desc}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Splash;

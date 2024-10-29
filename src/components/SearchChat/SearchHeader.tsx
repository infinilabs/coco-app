import React, { useState } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
}) => {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex items-center px-2.5 py-1 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 font-medium">
        {label}
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-500 dark:text-gray-400" />
      </MenuButton>

      <MenuItems className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 focus:outline-none">
        {options.map((option) => (
          <MenuItem key={option.id}>
            {({ active }) => (
              <button
                onClick={() => onChange(option.id)}
                className={`w-full text-left px-3 py-1.5 text-xs ${
                  active ? "bg-gray-50 dark:bg-gray-700" : ""
                } ${
                  value === option.id
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {option.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};

const typeOptions: FilterOption[] = [
  { id: "all", label: "全部类型" },
  { id: "doc", label: "文档" },
  { id: "image", label: "图片" },
  { id: "code", label: "代码" },
];

const ownerOptions: FilterOption[] = [
  { id: "all", label: "全部归属" },
  { id: "personal", label: "个人" },
  { id: "team", label: "团队" },
  { id: "public", label: "公开" },
];

const creatorOptions: FilterOption[] = [
  { id: "all", label: "全部创建者" },
  { id: "me", label: "我创建的" },
  { id: "shared", label: "共享给我的" },
];

export const SearchHeader: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-600 dark:text-gray-400">
        搜索到{" "}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          200
        </span>{" "}
        条数据
      </div>
      <div className="flex gap-2">
        <FilterDropdown
          label="类型"
          options={typeOptions}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        <FilterDropdown
          label="归属"
          options={ownerOptions}
          value={ownerFilter}
          onChange={setOwnerFilter}
        />
        <FilterDropdown
          label="创建者"
          options={creatorOptions}
          value={creatorFilter}
          onChange={setCreatorFilter}
        />
      </div>
    </div>
  );
};

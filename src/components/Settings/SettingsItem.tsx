import { LucideIcon } from "lucide-react";

interface SettingsItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function SettingsItem({
  icon: Icon,
  title,
  description,
  children,
}: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Icon className="h-5 min-w-5 text-gray-400 dark:text-gray-500" />
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

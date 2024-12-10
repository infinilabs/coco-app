import { Select } from '@headlessui/react'

interface SettingsSelectProps {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}

export default function SettingsSelect({
  options,
  value,
  onChange,
}: SettingsSelectProps) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option} value={option.toLowerCase()}>
          {option}
        </option>
      ))}
    </Select>
  );
}

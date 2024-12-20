import { useState } from "react";
import {
  Settings,
  Search,
  Command,
  Keyboard,
  Globe,
  Zap,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${
        active
          ? "bg-indigo-50 text-indigo-600"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-4 h-4 mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function SettingItem({ icon: Icon, title, description, action }: any) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function AppSettings() {
  const [activeSection, setActiveSection] = useState("general");
  const [darkMode, setDarkMode] = useState(false);

  const sections = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Search },
    { id: "extensions", label: "Extensions", icon: Command },
    { id: "keyboard", label: "Keyboard", icon: Keyboard },
    { id: "advanced", label: "Advanced", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 flex min-h-[500px]">
          <div className="w-64 p-4 border-r border-gray-100">
            <div className="space-y-1">
              {sections.map((section) => (
                <NavItem
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  active={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                Settings
              </h1>

              <div className="space-y-1">
                <SettingItem
                  icon={Globe}
                  title="Language"
                  description="Choose your preferred language for the interface"
                  action={
                    <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      English
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  }
                />

                <SettingItem
                  icon={darkMode ? Moon : Sun}
                  title="Appearance"
                  description="Switch between light and dark mode"
                  action={
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span
                        className={`${
                          darkMode ? "translate-x-6" : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  }
                />

                <SettingItem
                  icon={Command}
                  title="Keyboard Shortcuts"
                  description="Customize your keyboard shortcuts"
                  action={
                    <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md hover:border-gray-300">
                      Configure
                    </button>
                  }
                />

                <SettingItem
                  icon={Zap}
                  title="Performance Mode"
                  description="Optimize for better performance"
                  action={
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppSettings;

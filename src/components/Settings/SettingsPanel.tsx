import React from "react";

interface SettingsPanelProps {
  title: string;
  children: React.ReactNode;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ children }) => {
  return (
    <div className="bg-background text-foreground rounded-xl p-6">
      {/* <h2 className="text-xl font-semibold mb-6">{title}</h2> */}
      {children}
    </div>
  );
};

export default SettingsPanel;

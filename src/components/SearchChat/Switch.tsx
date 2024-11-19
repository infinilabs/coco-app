import React, { useState } from "react";
import { Bot, Search } from "lucide-react";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ checked = false, onChange }) => {
  const [isChecked, setIsChecked] = useState(checked);

  const toggleSwitch = () => {
    setIsChecked(!isChecked);
    if (onChange) onChange(!isChecked);
  };

  return (
    <div
      role="switch"
      aria-checked={isChecked}
      className={`relative flex items-center justify-between w-9 h-4 rounded-full cursor-pointer transition-colors duration-300 ${
        isChecked ? "bg-[#4285f4]" : "bg-[#7373FF]"
      }`}
      onClick={toggleSwitch}
    >
      {isChecked ? <Bot className="w-3 ml-1 text-white" /> : <div></div>}
      {!isChecked ? <Search className="w-3 mr-1 text-white" /> : <div></div>}
      <div
        className={`absolute top-0 h-3 w-3 m-0.5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
          isChecked ? "translate-x-5" : "translate-x-0"
        }`}
      ></div>
    </div>
  );
};

export default Switch;

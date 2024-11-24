import { useState } from "react";

const TransitionComponent = () => {
  const [isTransitioned, setIsTransitioned] = useState(false);

  const handleToggle = () => {
    setIsTransitioned(!isTransitioned);
  };

  return (
    <div
      data-tauri-drag-region
      className="w-[680px] h-[600px] mx-auto bg-gray-100 overflow-hidden relative"
    >
      <div
        data-tauri-drag-region
        className={`absolute w-full bg-red-500 text-white flex items-center justify-center transition-all duration-500 ${
          isTransitioned ? "top-[510px] h-[90px]" : "top-0 h-[90px]"
        }`}
      >
        <button
          className="px-4 py-2 bg-white text-black rounded"
          onClick={handleToggle}
        >
          Toggle
        </button>
      </div>

      <div
        data-tauri-drag-region
        className={`absolute w-full bg-green-500 transition-opacity duration-500 ${
          isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
        } bottom-0 h-[500px]`}
      ></div>

      <div
        data-tauri-drag-region
        className={`absolute w-full bg-yellow-500 transition-all duration-500 ${
          isTransitioned
            ? "top-0 opacity-100 pointer-events-auto"
            : "-top-[510px] opacity-0 pointer-events-none"
        } h-[500px]`}
      ></div>
    </div>
  );
};

export default TransitionComponent;

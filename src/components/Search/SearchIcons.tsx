import { ArrowBigLeft, Search } from "lucide-react";

interface SearchIconsProps {
  lineCount: number;
  isChatMode: boolean;
  sourceData: any;
  setSourceData: (data: any | undefined) => void;
}

export default function SearchIcons({
  lineCount,
  isChatMode,
  sourceData,
  setSourceData,
}: SearchIconsProps) {
  if (isChatMode) {
    return null;
  }

  const iconContent = !sourceData ? (
    <Search className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8]" />
  ) : (
    <ArrowBigLeft
      className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8] cursor-pointer"
      onClick={() => setSourceData(undefined)}
    />
  );

  if (lineCount === 1) {
    return <>{iconContent}</>;
  } else {
    return <div className="w-full flex items-center">{iconContent}</div>;
  }
}

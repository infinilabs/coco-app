import { MoveRight } from "lucide-react";

interface SuggestionListProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionList({ suggestions, onSelect }: SuggestionListProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="text-left inline-flex items-center px-3 py-1.5 rounded-full bg-white dark:bg-[#202126] border border-[#E4E5EF] dark:border-[#272626] text-sm text-[#666666] dark:text-[#A3A3A3] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-fit max-w-full break-words whitespace-pre-wrap"
        >
          <span className="break-all">{suggestion}</span>
          <MoveRight className="w-3 h-3 ml-1.5 shrink-0" />
        </button>
      ))}
    </div>
  );
}

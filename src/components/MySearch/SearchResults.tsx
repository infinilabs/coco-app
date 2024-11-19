import { useEffect, useState } from "react";
import { FileIcon, FolderIcon } from "lucide-react";

interface SearchResultsProps {
  query: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  const [results, setResults] = useState<
    Array<{ name: string; path: string; type: "file" | "folder" }>
  >([]);

  useEffect(() => {
    const searchFiles = async () => {
      setResults([
        { name: "Document.pdf", path: "/documents/Document.pdf", type: "file" },
        { name: "Projects", path: "/documents/projects", type: "folder" },
      ]);
    };

    if (query) {
      searchFiles();
    }
  }, [query]);

  return (
    <div className="space-y-2">
      {results.map((result, index) => (
        <div
          key={index}
          className="flex items-center p-3 hover:bg-gray-100 rounded-md cursor-pointer"
        >
          {result.type === "file" ? (
            <FileIcon size={16} />
          ) : (
            <FolderIcon size={16} />
          )}
          <div className="ml-3">
            <div className="font-medium">{result.name}</div>
            <div className="text-sm text-gray-500">{result.path}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
